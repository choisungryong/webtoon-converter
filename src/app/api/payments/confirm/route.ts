import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { confirmPayment } from '../../../../lib/toss';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify order exists and belongs to user
  const order = (await env.DB.prepare(
    `SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending'`,
  )
    .bind(orderId, user.id)
    .first()) as any;

  if (!order) {
    return NextResponse.json({ error: 'Order not found or already processed' }, { status: 404 });
  }

  // Verify amount matches
  if (order.amount !== amount) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const tossSecretKey = env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
  }

  try {
    // Confirm with Toss
    const tossResult = await confirmPayment(tossSecretKey, paymentKey, orderId, amount);

    // Idempotent credit allocation
    const txId = generateUUID();
    const credits = order.credits as number;

    await env.DB.batch([
      // Update payment record
      env.DB.prepare(
        `UPDATE payments SET payment_key = ?, status = 'confirmed', toss_response = ?, confirmed_at = ? WHERE id = ?`,
      ).bind(paymentKey, JSON.stringify(tossResult), Date.now(), orderId),
      // Add credits to user
      env.DB.prepare(
        `UPDATE users SET paid_credits = paid_credits + ?, updated_at = ? WHERE id = ?`,
      ).bind(credits, Date.now(), user.id),
      // Log transaction
      env.DB.prepare(
        `INSERT INTO credit_transactions (id, user_id, amount, credit_type, reason, reference_id, balance_after, created_at) VALUES (?, ?, ?, 'paid', 'purchase', ?, 0, ?)`,
      ).bind(txId, user.id, credits, orderId, Date.now()),
    ]);

    return NextResponse.json({
      success: true,
      credits,
      orderId,
    });
  } catch (err) {
    console.error('[Payments/Confirm] Error:', err);

    // Mark as failed
    try {
      await env.DB.prepare(
        `UPDATE payments SET status = 'failed', toss_response = ? WHERE id = ?`,
      )
        .bind(String(err), orderId)
        .run();
    } catch { /* best effort */ }

    return NextResponse.json(
      { error: 'Payment confirmation failed' },
      { status: 500 },
    );
  }
}
