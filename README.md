# 기술 데모 포털

AI 요소기술 · 디지털 트윈 · 공간 분석 기술을 데모와 검증 지표로 소개하는
영업·투자 유치용 쇼케이스.

## 화면

| 경로 | 설명 |
|---|---|
| `/` | 메인 랜딩 — 대표 데모 자동 재생, 성과 요약, 3축, 대표 기술 |
| `/tech` | 기술 카탈로그 — 3축 필터, 보조 필터, 더보기 |
| `/tech/[id]` | 기술 상세 — 전 기술 공통 단일 템플릿 |
| `/solutions` | 솔루션 시나리오 |
| `/admin` | 관리자 (로그인 필요) |

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값을 채운 뒤
npm run dev                  # http://localhost:3000
```

`.env.local` 필수 항목:

```
SESSION_SECRET=   # openssl rand -base64 32
ADMIN_USER=
ADMIN_PASSWORD=
```

## 배포

### 어디에 올려야 하는가

**데모를 실제로 동작시키려면 모델 서버(`10.100.110.x`)에 닿는 망 안에서
실행해야 합니다.** 추론 호출과 embed 프록시가 모두 서버 사이드에서 내부망으로
나가기 때문에, 외부 클라우드에서는 데모가 동작하지 않습니다.

용도에 따라 두 가지로 나뉩니다.

| 목적 | 위치 | 결과 |
|---|---|---|
| 실제 운영 | 사내 서버 | 전부 동작 |
| 화면 검토·공유 | Vercel 등 | 화면은 정상, 데모는 폴백, 관리자 저장 불가 |

### 사내 서버 (Docker)

```bash
export SESSION_SECRET=$(openssl rand -base64 32)
export ADMIN_USER=admin
export ADMIN_PASSWORD='...'
docker compose up -d --build
```

`data/` 와 `public/uploads/` 는 볼륨으로 잡혀 있습니다. **이 두 볼륨이 없으면
이미지를 다시 올릴 때마다 관리자가 등록한 기술이 사라집니다.**

### Vercel

배포 자체는 됩니다. 다만 두 가지 제약이 있습니다.

1. **관리자 저장이 되지 않습니다.** 배포 산출물이 읽기 전용이라 파일 기반
   저장소가 쓰기를 할 수 없습니다. 저장을 시도하면 503 과 함께 안내 문구가
   나옵니다(원인 모를 500 대신). 공개 화면 검토용으로는 문제가 없습니다.
2. **데모가 폴백으로 표시됩니다.** 내부망에 닿을 수 없어 정상입니다 —
   안내 문구와 함께 영상 또는 대표 수치로 대체됩니다.

환경변수(`SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`)는 Vercel 프로젝트
설정에 넣어야 합니다. 없으면 관리 화면 진입 시 오류가 납니다.

**Production Branch 설정을 확인하세요.** 기본값인 `main` 으로 두면 그 브랜치가
없을 때 프로덕션 URL 이 404 를 돌려줍니다.

#### 프로덕션 URL 이 `404: NOT_FOUND` 를 돌려줄 때

빌드는 성공했는데 `/` 가 404 라면 대부분 프레임워크 감지 문제입니다. 비어 있는
저장소를 Import 하면 Vercel 이 Next.js 를 감지하지 못해 Framework Preset 이
"Other" 로 굳고, 이후 코드가 들어와도 정적 사이트로 배포됩니다. 그러면
`public/` 만 서빙되어 루트에 `index.html` 이 없으니 404 가 납니다.

저장소의 `vercel.json` 이 `framework: nextjs` 를 강제하므로 재배포하면
해결됩니다. 그래도 404 라면 다음을 순서대로 확인하세요.

1. `/thumbnails/intrusion-detection.jpg` 가 열리는지 — **열리는데 `/` 가 404 면
   정적 배포가 맞습니다.** Settings → Build & Deployment 에서 Framework Preset
   을 Next.js 로 바꾸고 Output Directory 재정의를 지웁니다.
2. Settings → Git → Production Branch 가 실제 존재하는 브랜치인지
3. Settings → General → Root Directory 가 비어 있는지 (하위 폴더로 잘못 지정하면
   빌드 산출물이 없습니다)
4. Deployments 탭에 Ready 상태의 프로덕션 배포가 실제로 있는지

### 관리자를 실제로 쓰려면

파일 기반 저장소는 쓰기 가능한 디스크가 필요합니다. 클라우드에서 관리자까지
쓰려면 DB 로 전환해야 하며, 그때 고칠 곳은 `src/lib/data/index.ts` 의
`getRepo()` 한 곳입니다. 화면과 라우트는 `TechRepository` 인터페이스만
사용하므로 손댈 필요가 없습니다.

## 배포 전 점검

- [ ] `SESSION_SECRET` 을 무작위 값으로 교체 (`openssl rand -base64 32`)
- [ ] `ADMIN_PASSWORD` 를 실제 값으로 교체
- [ ] `public/videos/` 의 자리표시자 영상을 실제 데모 영상으로 교체
- [ ] `src/lib/brand.ts` 의 `CONFIRM` 표시 항목 확인 (설립 연도, 고객사 수, 문의처)
- [ ] CI 색상 확보 시 `src/app/globals.css` 의 `--color-brand` 교체

## 구조

```
data/                  JSON 저장소 (DB 전환 시 이 폴더만 대체)
src/lib/domain/        타입·고정 선택지·지표 판정·발행 검증·공개 직렬화
src/lib/data/          저장소 인터페이스와 JSON 구현 (getRepo 가 유일한 전환 지점)
src/lib/demo/          Gradio 호출과 결과 파일 서명 (서버 전용)
src/lib/brand.ts       브랜드 문구 단일 출처
src/components/demo/   데모 4종 + 실패 폴백
```

### 지켜야 할 규칙

- **데모 타입은 4종뿐입니다.** `Demo` 가 판별 유니온이라 타입 레벨에서 막힙니다.
- **지표 달성 판정은 `evaluateMetric` 만 씁니다.** 화면이 값을 직접 비교하면
  "낮을수록 좋은" 지표가 미달로 뒤집힙니다.
- **조건 단서는 지표 값과 한 덩어리로 렌더링합니다.** 떼면 과장 광고가 됩니다.
- **공개 화면에는 `toPublicTech` 를 거친 데이터만 넘깁니다.** 그대로 넘기면
  내부망 주소가 페이로드에 실립니다.
- **고정 선택지는 `enums.ts` 에서만 늘립니다.** 관리자 입력은 서버가 다시
  검증합니다.
