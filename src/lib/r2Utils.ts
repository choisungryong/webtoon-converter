/**
 * R2 utility functions for temporary input image storage.
 * Used by the background job processor to avoid D1 size limits.
 */

/**
 * Store a base64 data URI to R2 and return the key.
 */
export async function storeInputImage(
  r2: any,
  base64DataUri: string,
  jobId: string,
  index: number,
): Promise<string> {
  const match = base64DataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 data URI');

  const mimeType = `image/${match[1]}`;
  const raw = match[2];

  // Decode base64 to binary
  const binary = Uint8Array.from(atob(raw), c => c.charCodeAt(0));

  const key = `job-inputs/${jobId}/${index}.bin`;
  await r2.put(key, binary, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { mimeType },
  });

  return key;
}

/**
 * Load an input image from R2, returning base64 data and mimeType.
 */
export async function loadInputImage(
  r2: any,
  key: string,
): Promise<{ base64: string; mimeType: string }> {
  const obj = await r2.get(key);
  if (!obj) throw new Error(`R2 object not found: ${key}`);

  const mimeType = obj.customMetadata?.mimeType || obj.httpMetadata?.contentType || 'image/jpeg';
  const arrayBuffer = await obj.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Encode to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return { base64, mimeType };
}

/**
 * Clean up temporary input images after job completion.
 */
export async function cleanupInputImages(
  r2: any,
  jobId: string,
  count: number,
): Promise<void> {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(`job-inputs/${jobId}/${i}.bin`);
  }

  // R2 delete supports up to 1000 keys at once
  if (keys.length > 0) {
    await r2.delete(keys);
  }
}
