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
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
