import Link from 'next/link';

/**
 * 그룹 바로가기.
 *
 * 제품별·산업별 보기는 한 화면에 그룹이 여러 개 쌓이고 그룹마다 기술 카드가
 * 따라붙어 세로로 길어진다. 특정 제품을 보러 온 방문자가 스크롤로 찾아야
 * 하는 상태가 되므로, 머리에 목록을 두고 바로 내려가게 한다.
 *
 * 앵커 링크로 만든다. 자바스크립트 없이 동작하고, 주소가 그대로 남아
 * 영업 담당이 "AURON 부분" 을 가리키는 링크를 그대로 전달할 수 있다.
 */
export function GroupJumpBar({
  items,
}: {
  items: { id: string; label: string; count: number }[];
}) {
  // 하나뿐이면 이동할 곳이 없다. 조작만 늘고 하는 일은 없는 줄이 된다.
  if (items.length < 2) return null;

  return (
    <nav
      aria-label="바로가기"
      // 헤더(sm 이상 96px) 아래에 붙어 따라온다 — 목록이 길수록 위로 되돌아가는
      // 비용이 커지므로, 이동 수단은 스크롤을 따라와야 한다.
      className="sticky top-20 z-10 -mx-4 border-b border-ink-200 bg-ink-50/95 px-4 py-3 backdrop-blur sm:top-24"
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`#${item.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-ink-500 hover:text-ink-900"
          >
            {item.label}
            <span className="numeric text-xs text-ink-400">{item.count}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
