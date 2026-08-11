import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · ${BRAND.productName}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.tagline,
};

/** 문서 껍데기만 담당한다. 화면별 헤더·푸터는 각 구역의 레이아웃이 정한다. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      data-scroll-behavior: CSS 의 scroll-behavior: smooth 는 라우터가
      페이지를 옮기며 실행하는 "맨 위로" 스크롤까지 애니메이션으로 만들고,
      그 애니메이션이 렌더링에 밀려 끊기면 페이지가 살짝 내려간 위치에서
      시작한다. 이 속성이 있으면 Next 가 라우터 이동만 즉시 스크롤로
      처리한다 — 앵커 이동(#demo 등)은 그대로 부드럽게 움직인다.
    */
    <html lang="ko" data-scroll-behavior="smooth">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
