import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 데모 호출 프록시는 서버에서만 실행된다. 내부망 주소가 클라이언트 번들에
  // 새어 나가지 않도록 관련 값은 NEXT_PUBLIC_ 접두사를 쓰지 않는다.
  serverExternalPackages: ['@gradio/client'],
};

export default nextConfig;
