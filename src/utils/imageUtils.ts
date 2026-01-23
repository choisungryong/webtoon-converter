import { delay } from './commonUtils';

/**
 * 이미지 유틸리티 함수 모음
 */

/**
 * 이미지를 지정된 크기로 압축
 * @param src - 이미지 소스 URL 또는 데이터 URL
 * @param maxSize - 최대 크기 (기본값: 512)
 * @param quality - JPEG 품질 (기본값: 0.90)
 */
export const compressImage = (
  src: string,
  maxSize: number = 512,
  quality: number = 0.9
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let canvas: HTMLCanvasElement | null = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      ctx?.drawImage(img, 0, 0, width, height);
      const result = canvas.toDataURL('image/jpeg', quality);

      // Explicitly release memory
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
      img.src = '';
      img.onload = null;
      img.onerror = null;

      resolve(result);
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = src;
  });
};

/**
 * 두 이미지 데이터 간의 차이를 계산 (장면 전환 감지용)
 * @param img1 - 첫 번째 이미지 데이터
 * @param img2 - 두 번째 이미지 데이터
 * @returns 차이 값 (0-255 범위)
 */
export const calculateImageDifference = (
  img1: ImageData,
  img2: ImageData
): number => {
  const data1 = img1.data;
  const data2 = img2.data;
  let diff = 0;
  let count = 0;

  // Sampling for speed (check every 4th pixel)
  for (let i = 0; i < data1.length; i += 16) {
    const r = Math.abs(data1[i] - data2[i]);
    const g = Math.abs(data1[i + 1] - data2[i + 1]);
    const b = Math.abs(data1[i + 2] - data2[i + 2]);
    diff += (r + g + b) / 3;
    count++;
  }
  return diff / count;
};

/**
 * 여러 이미지를 세로로 스티칭
 * @param imageUrls - 이미지 URL 배열
 * @param targetWidth - 목표 너비 (기본값: 800)
 * @param maxHeight - 최대 높이 (기본값: 8000)
 * @returns 스티칭된 이미지의 데이터 URL
 */
export const stitchImagesVertically = async (
  imageUrls: string[],
  targetWidth: number = 800,
  maxHeight: number = 8000
): Promise<string> => {
  let canvas: HTMLCanvasElement | null = null;

  try {
    // Helper to load a single image
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = url;
      });
    };

    // Phase 1: Calculate dimensions first (lightweight - just get sizes)
    const dimensions: {
      width: number;
      height: number;
      scaledHeight: number;
    }[] = [];
    let totalHeight = 0;

    for (const url of imageUrls) {
      const img = await loadImage(url);
      const scale = targetWidth / img.width;
      const scaledHeight = Math.round(img.height * scale);
      dimensions.push({ width: img.width, height: img.height, scaledHeight });
      totalHeight += scaledHeight;
      // Release image reference immediately
      img.src = '';
      img.onload = null;
      img.onerror = null;
    }

    // Mobile memory limit check (lower threshold for safety)
    if (totalHeight > maxHeight) {
      throw new Error('이미지가 너무 깁니다. 선택한 장면 수를 줄여주세요.');
    }

    // Phase 2: Create canvas and draw images sequentially
    canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    if (!ctx) throw new Error('Canvas를 생성할 수 없습니다.');

    let currentY = 0;
    for (let i = 0; i < imageUrls.length; i++) {
      const img = await loadImage(imageUrls[i]);
      const { scaledHeight } = dimensions[i];

      // Draw immediately
      ctx.drawImage(img, 0, currentY, targetWidth, scaledHeight);
      currentY += scaledHeight;

      // Release image reference immediately after drawing
      img.src = '';
      img.onload = null;
      img.onerror = null;

      // Give browser a chance to GC between images
      await delay(10);
    }

    // Get result with lower quality for mobile
    const result = canvas.toDataURL('image/jpeg', 0.8);

    // Validate result
    if (!result || result === 'data:,' || result.length < 1000) {
      throw new Error(
        '이미지 생성에 실패했습니다. 메모리가 부족할 수 있습니다.'
      );
    }

    return result;
  } catch (e: any) {
    throw new Error(`이미지 합치기 실패: ${e.message}`);
  } finally {
    // Explicitly release canvas memory
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
};
