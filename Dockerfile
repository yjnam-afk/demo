# 사내 서버 배포용 이미지.
#
# 이 포털은 반드시 모델 서버(10.100.110.x)에 닿는 망 안에서 돌아야 한다.
# 데모 호출과 embed 프록시가 모두 서버 사이드에서 내부망으로 나가기 때문이다.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시점에는 비밀값이 필요 없다. 실행 시 환경변수로 주입한다.
# standalone 은 컨테이너 배포에서만 켠다 (Vercel 은 자체 빌더가 처리한다).
ENV BUILD_STANDALONE=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 초기 데이터. 운영에서는 아래 경로를 볼륨으로 덮어써 컨테이너를 다시 만들어도
# 관리자가 등록한 내용이 남게 한다.
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# 관리자 업로드가 쌓이는 곳. 반드시 볼륨으로 잡는다.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -q --spider http://127.0.0.1:3000/api/tech || exit 1

CMD ["node", "server.js"]
