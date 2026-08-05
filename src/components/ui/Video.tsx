/**
 * 영상 소스 목록.
 *
 * mp4(H.264)를 먼저 두어 대부분의 브라우저가 첫 소스를 그대로 쓰게 하고,
 * H.264 디코더가 없는 빌드를 위해 WebM 을 뒤에 붙인다. 브라우저는 재생 가능한
 * 첫 소스를 고르므로 순서가 곧 우선순위다.
 *
 * 영상 태그를 쓰는 곳이 카드·상세·폴백 세 군데라, 소스 구성을 한곳에 모아
 * 새 판본이 생겨도 한 파일만 고치면 되게 한다.
 */
export function VideoSources({ mp4, webm }: { mp4: string; webm?: string }) {
  return (
    <>
      <source src={mp4} type="video/mp4" />
      {webm ? <source src={webm} type="video/webm" /> : null}
    </>
  );
}
