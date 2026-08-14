# 집밥 레시피

집에 있는 재료로 만들 수 있는 요리를 Claude가 추천해주는 개인용 웹앱.

## 시작하기

1. `.env.local`에 필요한 값 채우기 (`.env.example` 참고):
   - `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com)에서 발급
   - `SUPABASE_URL` — Supabase 프로젝트 URL (이미 채워져 있음)
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase 대시보드 → Project Settings → API에서 복사
   - `APP_PASSWORD` — 이 앱에 로그인할 때 사용할 비밀번호 (직접 정하기)
   - `SESSION_SECRET` — 이미 생성되어 채워져 있음

2. 개발 서버 실행:

```bash
npm run dev
```

3. [http://localhost:3000](http://localhost:3000) 접속 → `APP_PASSWORD`로 로그인 → 재료 추가 → "레시피 추천받기"

## 배포

Vercel에 배포 시 위 5개 환경변수를 프로젝트 설정에 동일하게 등록해야 합니다.
