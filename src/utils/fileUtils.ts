/**
 * 파일 및 저장 관련 유틸리티 함수
 */

/**
 * 타임스탬프가 포함된 파일명 생성
 * @param prefix - 파일명 접두사 (예: 'webtoon', 'premium')
 * @param extension - 확장자 (점 포함 또는 미포함, 예: 'png', '.jpg')
 * @returns 생성된 파일명 (예: 'webtoon-1706123456789.png')
 */
export const generateTimestampedFilename = (
  prefix: string,
  extension: string
): string => {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${prefix}-${Date.now()}${ext}`;
};

/**
 * URL에서 파일 다운로드 트리거
 * @param url - 다운로드할 파일의 URL
 * @param filename - 저장할 파일명
 */
export const downloadFile = async (
  url: string,
  filename: string
): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download failed:', err);
    throw new Error('다운로드에 실패했습니다.');
  }
};

/**
 * 파일 크기가 제한 이하인지 확인
 * @param sizeBytes - 파일 크기 (바이트)
 * @param maxMB - 최대 크기 (MB)
 * @returns 제한 이하이면 true
 */
export const isValidFileSize = (sizeBytes: number, maxMB: number): boolean => {
  return sizeBytes <= maxMB * 1024 * 1024;
};

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환 (예: 1.5MB)
 * @param bytes - 파일 크기 (바이트)
 * @param decimals - 소수점 자릿수
 * @returns 포맷팅된 문자열
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
