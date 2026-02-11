// Toss Payments API client for Cloudflare Workers edge runtime

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  approvedAt: string;
  [key: string]: unknown;
}

/**
 * Confirm a payment with Toss Payments API.
 * Called after user completes checkout and is redirected to success URL.
 */
export async function confirmPayment(
  secretKey: string,
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossConfirmResponse> {
  const credentials = btoa(`${secretKey}:`);

  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(
      `Toss confirm failed: ${res.status} ${(error as any).message || JSON.stringify(error)}`,
    );
  }

  return res.json() as Promise<TossConfirmResponse>;
}

/**
 * Cancel a payment (refund).
 */
export async function cancelPayment(
  secretKey: string,
  paymentKey: string,
  cancelReason: string,
): Promise<unknown> {
  const credentials = btoa(`${secretKey}:`);

  const res = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(
      `Toss cancel failed: ${res.status} ${(error as any).message || JSON.stringify(error)}`,
    );
  }

  return res.json();
}

/**
 * Verify Toss webhook signature using HMAC-SHA256.
 */
export async function verifyWebhookSignature(
  webhookSecret: string,
  body: string,
  signature: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return computed === signature;
  } catch {
    return false;
  }
}
