/**
 * 공통 유틸리티 함수 (ID 생성, 지연 등)
 */

/**
 * UUID v4 생성
 * 환경에 따라 crypto.randomUUID() 또는 폴백 사용
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments where crypto.randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 지정된 시간만큼 대기 (Promise 기반 sleep)
 * @param ms - 대기 시간 (밀리초)
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 배열에서 무작위 요소 선택
 * @param array - 소스 배열
 * @returns 무작위로 선택된 요소
 */
export const getRandomElement = <T>(array: T[]): T => {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};
