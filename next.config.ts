import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 데모 호출 프록시는 서버에서만 실행된다. 내부망 주소가 클라이언트 번들에
  // 새어 나가지 않도록 관련 값은 NEXT_PUBLIC_ 접두사를 쓰지 않는다.
  serverExternalPackages: ['@gradio/client'],

  /**
   * data/*.json 을 서버 번들에 포함시킨다.
   *
   * 저장소가 파일 경로를 런타임에 조립하기 때문에(process.cwd() + 'data')
   * Next 의 자동 추적이 이 파일들을 의존성으로 보지 못한다. 그대로 배포하면
   * 서버리스 함수 안에 데이터 파일이 없어 카탈로그가 통째로 비어 보인다.
   * 로컬에서는 재현되지 않고 배포 후에만 드러나는 종류의 문제라 명시해 둔다.
   */
  outputFileTracingIncludes: {
    '/**': ['./data/**/*'],
  },

  /**
   * 컨테이너 배포용 산출물.
   *
   * Vercel 은 자체 빌더가 산출물을 만들므로 standalone 을 켜면 오히려 방해가 된다.
   * Dockerfile 에서만 BUILD_STANDALONE=1 을 준다.
   */
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
};

export default nextConfig;
