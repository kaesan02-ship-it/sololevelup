# GitHub Pages 배포

## 준비된 구성

- `.github/workflows/deploy.yml`: main에 push하거나 수동 실행하면 테스트·정적 빌드 후 Pages에 배포한다.
- 예상 사이트 주소: `https://kaesan02-ship-it.github.io/sololevelup/`. 이 주소는 실제 배포 성공을 확인하기 전까지 예정 주소다.
- `NEXT_PUBLIC_BASE_PATH=/sololevelup npm run build:pages`는 `.next-pages/`에 HTML·JS·CSS·로컬 폰트·PWA 파일을 생성한다.
- `npm run test:pages`는 위 산출물을 같은 하위 경로로 제공해 모바일 기록 작성, manifest 경로, 폰트, 오프라인 재실행·저장을 검증한다.
- `npm run build`로 일반 Next 서버용 빌드를 다시 만들 수 있다. 정적 산출물은 저장소에 커밋하지 않는다.

## GitHub에서 최초 활성화

1. 저장소 `Settings → Pages → Build and deployment → Source`를 **GitHub Actions**로 설정한다.
2. `Actions → Deploy Solo Levelup → Run workflow`에서 main을 선택해 실행한다. 이후 main push는 자동 배포한다.
3. 실행의 build와 deploy가 모두 성공했는지 확인하고 배포 결과의 URL을 연다.
4. 비공개 저장소라면 현재 GitHub 요금제에서 Pages를 지원하는지 확인한다. 배포를 위해 저장소 공개 범위를 자동 변경하지 않는다.

배포 시 가입/로그인 기능은 Supabase 연결 여부에 따라 활성화된다. 연결 전에는 개인용 로컬 저장 앱으로 사용할 수 있다. 소스 코드와 앱 파일이 배포되며, 사용자가 브라우저에 저장한 개인 기록·사진은 Git 저장소나 배포 산출물에 포함되지 않는다. 각 기기의 브라우저 저장소는 별개다.

## Supabase를 연결할 때

`docs/SUPABASE-SETUP.md`에 따라 프로젝트를 만든다. 저장소 `Settings → Secrets and variables → Actions → Variables`에 다음 **공개 클라이언트 값**을 설정하고 워크플로를 다시 실행한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

service_role/secret 키는 사용하지 않는다. Supabase Auth의 Site URL은 실제 배포 주소로 지정한다. 클라우드 개발 환경의 변수와 GitHub Actions 변수는 별도이므로 각각 설정해야 한다.

## 현재 확인 범위

2026-10-12: 정적 빌드와 `/sololevelup/` 경로의 모바일·오프라인 브라우저 검사 통과. GitHub API와 공개 사이트 접근에 필요한 `api.github.com`, `kaesan02-ship-it.github.io`를 환경 설정 초안에 추가했다. 현재 API 요청은 프록시 Forbidden으로 차단되어 원격 Pages 설정·Actions 실행 결과를 확인하지 못했다. 공개 URL의 실제 성공은 별도 확인이 필요하다.
