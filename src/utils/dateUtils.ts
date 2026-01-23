/**
 * 날짜 및 시간 관련 유틸리티 함수
 */

/**
 * 타임스탬프 또는 Date 객체를 한국어 날짜 형식으로 변환
 * @param date - 타임스탬프(초 또는 밀리초) 또는 Date 객체
 * @param options - Intl.DateTimeFormatOptions (기본값: 년, 월, 일)
 * @returns 포맷팅된 날짜 문자열
 */
export const formatToKoreanDate = (
  date: Date | number | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string => {
  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    // 10자리 타임스탬프(초)인 경우 1000을 곱함 (대략 1973년 이전 데이터는 없을 것으로 가정)
    if (date < 10000000000) {
      dateObj = new Date(date * 1000);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = new Date(date);
  }

  return dateObj.toLocaleDateString('ko-KR', options);
};

/**
 * 날짜를 '오늘', '어제', 또는 날짜 문자열로 변환 (갤러리 그룹핑용)
 * @param dateInput - 날짜 문자열, 타임스탬프, 또는 Date 객체
 * @returns '오늘', '어제', 또는 날짜 문자열
 */
export const getRelativeDateLabel = (
  dateInput: Date | number | string
): string => {
  const today = new Date();
  const todayStr = formatToKoreanDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatToKoreanDate(yesterday);

  const targetDateStr = formatToKoreanDate(dateInput);

  if (targetDateStr === todayStr) return '오늘';
  if (targetDateStr === yesterdayStr) return '어제';
  return targetDateStr;
};
