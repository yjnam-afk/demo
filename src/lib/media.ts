/**
 * 업로드를 허용하는 미디어 형식.
 *
 * 확장자는 실제 MIME 에서 정한다 — 파일명에 담긴 확장자는 신뢰하지 않는다.
 * 서버 검증과 클라이언트의 업로드 경로 생성이 같은 목록을 봐야 하므로
 * 한 파일로 뺐다.
 */
export const MEDIA_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  // 관련 자료용 — 성능시험 결과서 같은 문서가 여기로 올라온다.
  'application/pdf': 'pdf',
};

export const MEDIA_MAX_BYTES = 300 * 1024 * 1024;

/** 업로드 대상 슬롯. 임의 경로에 쓰지 못하게 목록으로 묶는다. */
export const MEDIA_KINDS = ['thumbnail', 'loop', 'video', 'resource'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/**
 * Blob 에 올라간 업로드 파일의 경로 규칙.
 * 서버가 토큰을 내주기 전에 이 규칙으로 경로를 검증한다 — 클라이언트가
 * data/ 같은 문서 경로에 쓰는 것을 막는 마지막 벽이다.
 */
export const BLOB_UPLOAD_PATH = /^uploads\/[a-z0-9][a-z0-9-]{1,63}\/(thumbnail|loop|video|resource)-\d+\.[a-z0-9]+$/;

/**
 * 화면에 바로 펼쳐 보여줄 수 있는 이미지 경로인지.
 *
 * 관련 자료 중 이미지는 링크로 접어 두지 않고 상세 화면에 그대로 펼친다.
 * 확장자로만 판별하므로 확장자 없는 경로(드라이브 링크 등)는 파일 취급된다.
 */
export function isImagePath(path: string): boolean {
  return /\.(jpe?g|png|webp|svg|gif)(\?|#|$)/i.test(path);
}

/**
 * 브라우저가 문서 뷰어로 펼칠 수 있는 PDF 경로인지.
 * 시험 성적서·결과보고서가 여기 해당한다. 이미지와 같은 이유로 접어 두지
 * 않고 상세 화면에 펼친다.
 */
export function isPdfPath(path: string): boolean {
  return /\.pdf(\?|#|$)/i.test(path);
}
