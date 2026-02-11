import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { verifyWebhookSignature } from '../../../../lib/toss';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();

  const webhookSecret = env.TOSS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const bodyText = await request.text();
  const signature = request.headers.get('Toss-Signature') || '';

  // Verify signature
  const valid = await verifyWebhookSignature(webhookSecret, bodyText, signature);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { eventType } = payload;

  try {
    if (eventType === 'PAYMENT_STATUS_CHANGED') {
      const data = payload.data;
      const { orderId, paymentKey, status } = data;

      if (status === 'CANCELED' || status === 'EXPIRED' || status === 'ABORTED') {
        // Update payment status
        await env.DB.prepare(
          `UPDATE payments SET status = ?, toss_response = ? WHERE id = ?`,
        )
          .bind(status.toLowerCase(), JSON.stringify(data), orderId)
          .run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Payments/Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
