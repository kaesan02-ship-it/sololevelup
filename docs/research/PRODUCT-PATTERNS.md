# 지속 기록 서비스 사례 검토 · 2026-10-13

공식 공개 자료를 직접 읽은 사례 비교다. 매출·활성 사용자·유지율을 검증한 성공 순위나 인과 연구가 아니다. 소스코드나 디자인 자산을 복사하지 않고 기능 원칙만 참고한다.

| 사례/확인한 자료 | 확인한 방식 | 이 앱에 반영 |
|---|---|---|
| [Habitica 공식 README](https://github.com/HabitRPG/habitica) | 실생활을 RPG처럼 구성, 성공 시 레벨/골드, 실패 시 HP 감소 | 성장 단계·퀘스트·레벨업 피드백. 체력 감소/벌칙/장비 경제는 초기 개인 기록 앱에서 제외 |
| [Loop Habit Tracker 공식 README](https://github.com/iSoron/uhabits) | 경량 UI, 장기 그래프, 유연한 일정, 며칠 빠져도 진전이 전부 사라지지 않는 점수, 오프라인/내보내기 | 휴식에 페널티 없음, 이미 쌓은 XP 유지, 백업과 선택 기록 유지 |
| [Anki 공식 README](https://github.com/ankitects/anki) | 간격 반복 학습 프로그램 | 작은 실천의 반복을 중심에 둠. 학습 효과를 모든 활동/게임 XP에 일반화하지 않음 |

Habitica 기능 사이트, Finch, Day One, Duolingo 블로그는 현재 프록시 403으로 본문 열람에 실패했다. 이들의 최신 화면·기능·성과를 확인했다고 주장하지 않는다. 조사 범위를 확장하려면 habitica.com, finchcare.com, dayoneapp.com, blog.duolingo.com 접근이 필요하다.

하루 회고는 사용자 요청을 바탕으로 한 제품 가설이다. 세 문항을 선택 작성하고 점수/연속 기록 의무를 붙이지 않는다. 이후 사용자 테스트에서 작성 부담과 재방문 가치를 확인한다. 치료·건강 개선 효과를 주장하지 않는다.

[Supabase 비밀번호 인증 공식 문서](https://supabase.com/docs/guides/auth/passwords)와 [프로덕션 체크리스트](https://supabase.com/docs/guides/platform/going-into-prod)는 실제 열람했다. 이메일 인증, SMTP, 복구 리다이렉트, RLS, 백업, 부하/남용 대응이 공개 배포 검토에 필요하다. 기본 메일 서비스 제한과 Free 플랜의 휴면 일시 정지 가능성도 운영 검토 대상이다.
