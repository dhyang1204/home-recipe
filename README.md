# 집밥 레시피

집에 있는 재료로 만들 수 있는 요리를 추천해주는 개인용 웹앱. Claude가 재료를 보고 어울리는 요리 이름을 골라주면, YouTube에서 실제 레시피 영상을 찾아 보여준다.

## 시작하기

1. `.env.local`에 필요한 값 채우기 (`.env.example` 참고):
   - `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com)에서 발급
   - `YOUTUBE_API_KEY` — [console.cloud.google.com](https://console.cloud.google.com)에서 YouTube Data API v3 사용 설정 후 발급
   - `SUPABASE_URL` — Supabase 프로젝트 URL (이미 채워져 있음)
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase 대시보드 → Project Settings → API에서 복사

2. 개발 서버 실행:

```bash
npm run dev
```

3. [http://localhost:3000](http://localhost:3000) 접속 → 재료 추가 → "레시피 추천받기"

이 앱은 로그인 없이 링크만 있으면 누구나 접속할 수 있다. 개인용으로 만들었으니 링크를 공유하지 않도록 주의할 것 — 접속한 사람은 재료 목록을 보거나 수정할 수 있고, 추천을 받을 때마다 Anthropic/YouTube API 크레딧이 소모된다.

## 배포

Vercel에 배포 시 위 4개 환경변수를 프로젝트 설정에 동일하게 등록해야 합니다.
