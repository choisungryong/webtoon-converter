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
  maxSize: number = 1024,
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
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = src;
  });
};

/**
 * 이미지 데이터에서 색상 히스토그램 생성 (32구간)
 * RGB 각 채널을 8단계로 양자화하여 총 32bin 히스토그램 생성
 */
const buildHistogram = (data: Uint8ClampedArray): Float32Array => {
  const BINS = 32;
  const hist = new Float32Array(BINS * 3); // R(32) + G(32) + B(32)
  const binSize = 256 / BINS;
  let pixelCount = 0;

  // Sample every 4th pixel for speed
  for (let i = 0; i < data.length; i += 16) {
    const rBin = Math.min(BINS - 1, Math.floor(data[i] / binSize));
    const gBin = Math.min(BINS - 1, Math.floor(data[i + 1] / binSize));
    const bBin = Math.min(BINS - 1, Math.floor(data[i + 2] / binSize));
    hist[rBin]++;
    hist[BINS + gBin]++;
    hist[BINS * 2 + bBin]++;
    pixelCount++;
  }

  // Normalize
  if (pixelCount > 0) {
    for (let i = 0; i < hist.length; i++) {
      hist[i] /= pixelCount;
    }
  }
  return hist;
};

/**
 * 두 이미지 데이터 간의 차이를 히스토그램 기반으로 계산 (장면 전환 감지용)
 * 히스토그램 비교는 조명 변화에 강건하고 카메라 움직임에 덜 민감함
 * @param img1 - 첫 번째 이미지 데이터
 * @param img2 - 두 번째 이미지 데이터
 * @returns 차이 값 (0~1 범위, 1에 가까울수록 완전히 다른 장면)
 */
export const calculateImageDifference = (
  img1: ImageData,
  img2: ImageData
): number => {
  const hist1 = buildHistogram(img1.data);
  const hist2 = buildHistogram(img2.data);

  // Bhattacharyya distance: 1 - sum(sqrt(h1[i] * h2[i]))
  // 0 = identical, 1 = completely different
  let similarity = 0;
  for (let i = 0; i < hist1.length; i++) {
    similarity += Math.sqrt(hist1[i] * hist2[i]);
  }
  // Normalize by 3 channels
  similarity /= 3;
  return 1 - similarity;
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
  maxHeight: number = 20000
): Promise<string> => {
  let canvas: HTMLCanvasElement | null = null;

  try {
    // Helper to load a single image
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
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

    // Memory safety check: canvas pixel count limit
    // Most mobile browsers limit canvas to ~16M pixels (4096x4096)
    // Desktop browsers typically support up to ~268M pixels
    const MAX_CANVAS_PIXELS = 16_000_000; // conservative mobile limit
    const pixelCount = targetWidth * totalHeight;

    if (totalHeight > maxHeight || pixelCount > MAX_CANVAS_PIXELS) {
      throw new Error('STITCH_TOO_LARGE');
    }

    // Phase 2: Create canvas and draw images sequentially
    canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    if (!ctx) throw new Error('CANVAS_CREATION_FAILED');

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
      throw new Error('CANVAS_RENDER_FAILED');
    }

    return result;
  } catch (e: any) {
    // Re-throw known error codes as-is for i18n handling upstream
    if (['STITCH_TOO_LARGE', 'CANVAS_CREATION_FAILED', 'CANVAS_RENDER_FAILED'].includes(e.message)) {
      throw e;
    }
    throw new Error(`Image stitching failed: ${e.message}`);
  } finally {
    // Explicitly release canvas memory
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
};
