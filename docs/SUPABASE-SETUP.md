# 휴대폰·PC 동기화 연결 안내

현재 앱의 로그인·동기화 코드는 구현되어 있지만 아직 실제 Supabase 프로젝트가 연결되지 않았습니다. 아래 설정이 완료되면 실제 계정과 두 기기로 검증할 수 있습니다. 연결 전에도 로컬 기록과 백업은 사용할 수 있습니다.

## 1. 연결할 기존 프로젝트

사용자가 제공한 프로젝트: `uotscostmadmnaypdxus`.

- [프로젝트 대시보드](https://supabase.com/dashboard/project/uotscostmadmnaypdxus)
- Project URL: `https://uotscostmadmnaypdxus.supabase.co`
- [공개 API 키 확인](https://supabase.com/dashboard/project/uotscostmadmnaypdxus/settings/api-keys)
- [SQL Editor](https://supabase.com/dashboard/project/uotscostmadmnaypdxus/sql/new)

2026-10-12 프로젝트 Auth 주소가 HTTP 401 `No API key found in request`로 응답함을 확인했다. 이는 서비스에 도달했다는 뜻이며 로그인·DB·RLS 설정 완료를 의미하지 않는다. 프로젝트를 새로 만들 필요는 없다. Project URL은 클라우드 환경 설정 초안에 제안값으로 저장했고 공개 Publishable key와 아래 SQL 실행은 아직 필요하다.

## 2. 저장 테이블과 권한 적용

프로젝트의 SQL Editor에서 [supabase/setup.sql](../supabase/setup.sql) 전체 내용을 실행합니다. 이 스크립트는 본인 계정만 자신의 저장 문서를 읽고 쓸 수 있도록 RLS를 적용하며, 버전이 바뀐 문서를 덮어쓰지 않는 저장 함수를 만듭니다. 앱만으로 이 스크립트가 자동 실행되지는 않습니다.

## 3. 연결 정보 설정

프로젝트의 Connect 또는 Settings → API/ API Keys에서 다음 두 항목을 확인합니다. 대시보드 이름은 서비스 업데이트에 따라 달라질 수 있습니다.

| 환경 변수 | 입력할 값 |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Project URL, 예: https://프로젝트ID.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key (`sb_publishable_...`) 또는 프로젝트의 공개 anon 키 |

**service_role 키와 secret 키는 사용하지 않습니다.** 공개 키만 클라이언트 번들에 포함됩니다. DB 비밀번호도 여기에 넣지 않습니다.

이 채팅의 클라우드 환경 설정에는 위 두 변수와 `*.supabase.co` 네트워크 허용 요구가 초안으로 저장되어 있습니다. 환경 설정에서 값을 입력하고 저장한 뒤 환경을 게시하세요. 저장/게시는 SQL 실행과 별개이며, 현재 실행 중인 앱은 값을 반영해 다시 빌드·시작해야 합니다. 프로젝트 URL과 공개 키는 채팅에 붙여넣을 필요가 없습니다.

배포용 GitHub Actions는 저장소 Settings → Secrets and variables → Actions → Variables의 동일한 두 변수를 읽습니다. 클라우드 개발 환경의 값과 GitHub Actions의 값은 별개입니다. 현재 연결된 GitHub 앱은 Actions 변수 관리 API 권한이 없어 변수 설정을 대신할 수 없습니다. 공개 키는 사용자가 저장소 Variables에 설정한 뒤 알려주면 재배포할 수 있습니다.

로컬 개발에서는 `.env.example`을 참고해 Git에서 제외된 `.env.local`에 값을 설정하세요.

## 4. 이메일 로그인 준비

Authentication에서 Email 로그인을 활성화합니다. 기본 이메일 인증을 유지한 경우 가입 메일을 확인한 뒤 로그인합니다. Auth URL Configuration의 Site URL과 허용 Redirect URL은 실제 배포할 앱 주소에 맞춥니다. 처음에는 테스트 계정으로 가입·로그인을 확인하고, 필요한 경우 서비스가 안내하는 메일 발송 설정/제한을 확인하세요.

현재 공개 앱은 https://kaesan02-ship-it.github.io/sololevelup/ 입니다. Supabase Auth의 Site URL과 Redirect URL에 이 주소를 사용하세요.

## 5. 처음 두 기기 연결하기

1. 기록이 있는 첫 기기에서 설정 → 기기 간 동기화 → 계정 만들기/로그인.
2. ‘이 기기의 기록 사용’으로 기존 기록을 클라우드에 저장.
3. 두 번째 기기에서 같은 계정으로 로그인.
4. 두 번째 기기에서는 ‘클라우드 기록 사용’을 선택하여 내려받기.
5. 한 기기에서 기록을 추가하고 다른 기기를 다시 활성화하거나 ‘지금 동기화’를 눌러 확인.

첫 연결 때 두 기기 기록을 자동 합치지 않습니다. 클라우드 기록과 이 기기 기록 중 하나를 선택하며, 교체 전 JSON 백업을 권장합니다.

온라인 기록은 자동 동기화합니다. 오프라인 기록은 로컬 저장하고 연결 복구 시 다시 시도합니다. 양쪽 기기를 오프라인 등으로 각각 수정했다면 충돌을 표시하고 자동 덮어쓰지 않습니다. 유지할 기록을 선택해야 하므로, 선택 전에 각 기기에서 백업하세요. 사진도 동기화 문서와 JSON 백업에 포함됩니다.

## 실제 연결 후 검증할 사항

- 가입·메일 확인·로그인이 정상 동작하는지.
- 첫 기기 기록을 두 번째 기기에서 확인할 수 있는지.
- 프로필 사진과 기록 수정·삭제가 동기화되는지.
- 오프라인 기록이 온라인 복구 후 전달되는지.
- 두 계정이 서로의 기록에 접근할 수 없는지(RLS).
- 두 기기의 동시 수정이 충돌로 표시되는지.

현재 모의 계정/저장 API를 사용한 두 브라우저 동기화 테스트를 제공하지만, 실제 Supabase Auth·DB·메일 발송·RLS 운영 검증을 대신하지는 않습니다.
