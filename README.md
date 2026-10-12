# SOLO LEVELUP

휴대폰 중심의 개인 성장 기록 앱. 밝은 화이트톤 상태창에서 과거의 나와 현재를 비교합니다.

## 기능

- 체중·골격근량·푸시업·독서·공부·스트레칭 기본 세트 선택
- 자유 항목·분류, 측정·최고 기록·누적·시간·완료 체크
- 기록 추가·수정·삭제, 항목 고정·정렬·보관
- 7/30/90일 성장 비교, 스냅샷 8개 고정·최근/전체 모드·분류 필터
- 상세 스탯창: XP·연속 기록·활동 균형·목표·캘린더·모든 상세 지표
- 그래프, 주간/최종 목표, 경험치·레벨·업적
- 본인 사진/프로필 이미지 등록·변경·제거(기존 그림 캐릭터는 제거)
- JSON 백업/복원, CSV 내보내기
- Pretendard 한글 폰트, Android 터치·세로/가로 반응형
- 추천 활동 라이브러리(출처별 확인 범위·적용 한계 안내), 오늘의 XP 계산 내역, 활동 차트 축 선택
- 홈 화면 설치(PWA), 최초 온라인 준비 후 오프라인 재실행·기록 저장
- Supabase 이메일 로그인·자동 동기화·오프라인 대기·기기 간 충돌 처리 코드

기록은 우선 현재 브라우저의 IndexedDB에 저장합니다. 클라우드 동기화는 [Supabase 연결 안내](docs/SUPABASE-SETUP.md)를 완료한 경우에 활성화됩니다. **웹 배포와 Supabase 연결을 완료했고 실제 로그인·두 기기 동기화·계정 격리를 검증했습니다.** 로그인 전에도 개인용 로컬 기능은 사용할 수 있습니다.

## 실행

Node.js 22 이상. 클라우드 환경에서는 Node.js 24로 검증했습니다.

```bash
cd /workspace/sololevelup
npm ci --cache /tmp/solo-npm-cache
npm run dev
```

배포용 실행:

```bash
npm run build
npm run start
```

포트는 기본 3000입니다. 공개 계정 설정은 `.env.example`을 참고하세요. service_role/secret 키는 사용하지 않습니다. 로컬 파일 `.env.local`은 Git에서 제외합니다. Next.js의 NEXT_PUBLIC 변수는 빌드 시 반영되므로 연결 정보를 설정하면 다시 빌드해야 합니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
```

브라우저 테스트는 최신 배포용 빌드로 진행하며 서버가 없으면 자동 시작합니다. `/usr/bin/chromium` 또는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`을 사용합니다. 실행 중인 서버를 먼저 종료하고 빌드를 교체한 뒤 서버를 재시작하세요.

```bash
npm run test:cloud
```

동기화 테스트는 **모의 API만** 사용하는 두 독립 브라우저를 준비하고 로그인·첫 연결·다운로드·오프라인 기록·충돌 보존·명시적 해결을 확인합니다. 테스트용 공개 설정으로 빌드한 뒤, 성공/실패와 관계없이 원래 환경으로 다시 빌드합니다. 해당 명령 실행 전 본인이 시작한 서버를 종료하세요. 실제 Supabase 운영 검증은 별도로 진행해야 합니다.

## 설치·사진·데이터

배포용 앱을 온라인으로 한 번 열고 설정에서 ‘오프라인 준비 완료’를 확인하세요. 아이폰 Safari는 공유 → 홈 화면에 추가, Chrome/Edge는 앱 설치 메뉴를 사용합니다. 실제 휴대폰 배포에는 HTTPS 주소가 필요합니다.

사진은 JPG·PNG·WebP 최대 12MB를 선택하고, 큰 사진은 긴 변 1024px/저장용 2MB 이하로 최적화합니다. 원본 비율을 유지해 원형으로 표시하며 기기의 원본 파일은 변경하지 않습니다. 생성된 실물형 캐릭터 이미지가 있으면 같은 방식으로 등록할 수 있습니다. 사진에서 AI 캐릭터를 생성하는 기능은 현재 앱에 포함되지 않습니다.

로그인하지 않은 기록과 사진은 이 기기에만 저장됩니다. 연결한 계정에서는 사진도 동기화 문서에 포함됩니다. JSON 백업에는 사진이 들어가므로 개인 백업으로 보관하세요. 브라우저 데이터 삭제·사이트 주소 변경은 로컬 데이터에 영향을 줄 수 있습니다.

## 자료와 구성

- [최초 작업명세](docs/MVP-SPEC.md)
- [구현 현황](docs/IMPLEMENTATION.md)
- [페이지별 점검·스탯 명세](docs/PAGE-AUDIT.md)
- [안드로이드 검증 범위](docs/ANDROID-UI.md)
- [활동 초안·참고 문헌·XP 규칙](docs/research/ACTIVITY-EVIDENCE.md)
- [상세 스탯 화면](docs/preview-stats.png) · [모바일 스탯 화면](docs/preview-stats-mobile.png)
- [Supabase 연결 안내](docs/SUPABASE-SETUP.md)
- [PC 화면](docs/preview-desktop.png) · [모바일 화면](docs/preview-mobile.png)

화면 예시는 독립 테스트 브라우저의 예시 기록이며 실제 사용자 데이터로 저장되지 않습니다.

`app/dashboard.tsx` 화면·기록, `app/stats.tsx` 상세 스탯, `lib/stats.ts` 활동·목표·스냅샷 집계, `app/photo.tsx` 사진 프로필, `app/sync.tsx` 로그인·동기화, `lib/model.ts` 집계, `lib/storage.ts` 로컬 저장·동기화 대기, `lib/cloud.ts` Supabase API, `lib/sync-policy.ts` 충돌 판단, `public/sw.js` 앱 캐시, `supabase/setup.sql` 저장소·RLS.

기존 `/workspace/sololevelup` 체크아웃을 사용합니다. 사용자가 요청하지 않는 한 별도 Git worktree를 만들지 않습니다.

- [전체 구현 검토 결과](docs/REVIEW-2026-10-12.md)

- [GitHub Pages 배포 방법과 검증 범위](docs/DEPLOYMENT.md)

공개 앱: https://kaesan02-ship-it.github.io/sololevelup/ — 모바일 화면·기록 저장·오프라인 재실행 확인 완료.

날짜별 조회: **나의 기록 → 날짜별 보기**에서 과거 기록과 메모를 확인·수정하고 선택 날짜에 기록을 추가합니다. **나의 스탯 → 나의 기록 캘린더**에서도 조회 날짜를 직접 선택할 수 있습니다.

- [인바디 연동 검토와 필요한 조건](docs/INBODY-INTEGRATION.md)
