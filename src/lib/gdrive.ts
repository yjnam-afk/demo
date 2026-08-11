/**
 * 구글 드라이브 링크 지원.
 *
 * 드라이브의 공유 링크(/file/d/…/view)는 영상 파일이 아니라 재생 페이지라서
 * <video> 가 열 수 없다. 대용량 우회 주소(uc?export=download)는 바이러스 검사
 * 확인 페이지가 끼어들어 수십 MB 영상에서 랜덤하게 깨진다.
 *
 * 유일하게 안정적인 길은 Drive API 다 — files/<id>?alt=media 는 확인 페이지
 * 없이 바이트를 그대로 내리고 Range 요청(탐색)도 받는다. API 키만 있으면
 * "링크가 있는 모든 사용자" 공유 파일에 접근할 수 있다.
 *
 * 그래서 관리자가 드라이브 링크를 붙여넣으면 저장 시점에 /api/media/gdrive/<id>
 * 로 정규화하고, 그 라우트가 API 주소로 연결한다. 화면 코드는 이 경로를
 * 보통 영상 경로와 똑같이 다룬다.
 */

const PATTERNS = [
  /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/(?:uc|open)\?[^#]*\bid=([A-Za-z0-9_-]{10,})/,
];

/** 드라이브 공유 링크에서 파일 id 를 꺼낸다. 드라이브 링크가 아니면 null. */
export function extractDriveFileId(url: string): string | null {
  for (const pattern of PATTERNS) {
    const match = pattern.exec(url);
    if (match) return match[1];
  }
  return null;
}

/**
 * 미디어 경로 정규화 — 드라이브 링크면 재생 가능한 내부 경로로 바꾼다.
 * 그 외 값은 손대지 않는다.
 */
export function normalizeMediaPath(path: string): string {
  const id = extractDriveFileId(path);
  return id ? `/api/media/gdrive/${id}` : path;
}
