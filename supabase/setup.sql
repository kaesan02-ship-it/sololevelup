-- Run once in your own Supabase project's SQL editor.
create table if not exists public.growth_saves (
 id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 version bigint not null default 1 check (version >= 1),
 updated_at timestamptz not null default now()
);
alter table public.growth_saves enable row level security;
revoke all on public.growth_saves from anon;
grant select, insert, update on public.growth_saves to authenticated;
drop policy if exists "owner_select" on public.growth_saves;
drop policy if exists "owner_insert" on public.growth_saves;
drop policy if exists "owner_update" on public.growth_saves;
create policy "owner_select" on public.growth_saves for select to authenticated using ((select auth.uid())=id);
create policy "owner_insert" on public.growth_saves for insert to authenticated with check ((select auth.uid())=id);
create policy "owner_update" on public.growth_saves for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create or replace function public.save_growth_data(expected_version bigint,new_payload jsonb)
returns bigint language plpgsql security invoker set search_path=public as $$
declare current_version bigint; next_version bigint; owner uuid:=auth.uid();
begin
 if owner is null then raise exception 'authentication_required'; end if;
 if new_payload->>'schemaVersion' is distinct from '1' or jsonb_typeof(new_payload->'entries') is distinct from 'array' or jsonb_typeof(new_payload->'metrics') is distinct from 'array' then raise exception 'invalid_payload'; end if;
 if octet_length(new_payload::text)>10000000 then raise exception 'payload_too_large'; end if;
 -- Serialize saves for this account, including the first insert.
 perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
 select version into current_version from public.growth_saves where id=owner for update;
 if current_version is null then
  if expected_version<>0 then raise exception 'sync_conflict'; end if;
  insert into public.growth_saves(id,payload,version) values(owner,new_payload,1);return 1;
 end if;
 if current_version<>expected_version then raise exception 'sync_conflict'; end if;
 next_version:=current_version+1;
 update public.growth_saves set payload=new_payload,version=next_version,updated_at=now() where id=owner;
 return next_version;
end;$$;
revoke all on function public.save_growth_data(bigint,jsonb) from public;
grant execute on function public.save_growth_data(bigint,jsonb) to authenticated;
