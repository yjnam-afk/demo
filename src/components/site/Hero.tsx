import { LoopVideo } from '@/components/ui/LoopVideo';
import { BRAND } from '@/lib/brand';

/**
 * 히어로.
 *
 * 배경 자리는 비워 둔다.
 *
 * 전에는 대표 기술의 루프 영상을 깔았는데, 지금 있는 영상이 전부 자리표시자라
 * (public/videos/README.md) 탐지 상자와 좌표가 찍힌 합성 화면이 그대로
 * 첫 화면에 걸렸다. 방문자에게는 브랜드 영상이 아니라 깨진 이미지나 시험
 * 화면으로 읽힌다. 아무것도 없는 편이 낫다.
 *
 * 실제 브랜드 영상이나 이미지가 준비되면 BRAND.heroMedia 에 경로를 넣는다.
 * 값이 있을 때만 배경이 살아나고, 없으면 격자 배경과 문구만으로 성립한다.
 * 기술 데이터에 다시 연결하지는 않는다 — 히어로 배경은 브랜드 자산이지
 * 특정 기술의 데모 화면이 아니다.
 */
export function Hero() {
  const media = BRAND.heroMedia;

  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      {/*
        배경에는 전체 데모 영상이 아니라 짧은 루프를 쓴다. 전체 영상은 장면이
        바뀌고 용량이 몇 배라, 첫 화면에서만 수백 KB를 배경으로 흘려보내게 된다.
        루프가 없는 기술이 대표로 올라오면 그때만 전체 영상을 쓴다.
      */}
      {media?.video ? (
        <LoopVideo
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
          mp4={media.video}
          webm={media.video_webm}
          poster={media.poster}
          priority
        />
      ) : media?.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
          src={media.poster}
          alt=""
        />
      ) : null}

      {/* 영상 위 글자 가독성 확보. 아래쪽을 더 어둡게 눌러 지표 줄이 묻히지 않게 한다. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/85 via-ink-950/70 to-ink-950" />
      <div className="grid-backdrop absolute inset-0 -z-10 opacity-60" />

      <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/*
          회사 슬로건(Accelerating AI Creation)을 여기 두지 않는다. 이 포털은
          AI 외에 디지털 트윈과 공간 분석도 다루는데, 첫 화면에 AI 슬로건이
          서면 나머지 두 축이 곁다리로 읽힌다. 슬로건은 AI 축 화면에서만 쓴다.
        */}
        <h1 className="headline max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
          {BRAND.headline}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-700">{BRAND.intro}</p>

        {/*
          버튼은 두지 않는다. 도입 문의는 GNB 에 항상 떠 있고, 기술 카탈로그는
          GNB 의 기술 메뉴와 바로 아래 대표 기술 구간의 "전체 보기" 가 잇는다 —
          같은 문이 한 화면에 여러 개 서면 어느 것도 문으로 읽히지 않는다.
        */}
      </div>
    </section>
  );
}
