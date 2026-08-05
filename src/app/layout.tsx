import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '기술 데모 포털',
    template: '%s · 기술 데모 포털',
  },
  description: 'AI 요소기술 · 디지털 트윈 · 공간 분석 기술을 데모와 검증 지표로 확인합니다.',
};

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-ink-900">
          기술 데모 포털
        </Link>
        {/* 랜딩(3단계)·솔루션(5단계) 화면이 붙으면 해당 링크를 이 자리에 추가한다. */}
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/tech" className="text-ink-600 hover:text-ink-900">
            기술 카탈로그
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-500">
        <p className="font-medium text-ink-700">기술 데모 포털</p>
        <p>표기된 성능 지표는 각 항목에 명시된 평가 데이터셋과 조건에서 측정한 결과입니다.</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
