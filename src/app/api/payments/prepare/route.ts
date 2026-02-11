import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { getPackageById } from '../../../../lib/packages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { packageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const pkg = body.packageId ? getPackageById(body.packageId) : undefined;
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  const orderId = `BT-${Date.now()}-${generateUUID().slice(0, 8)}`;

  try {
    await env.DB.prepare(
      `INSERT INTO payments (id, user_id, amount, credits, package_id, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
      .bind(orderId, user.id, pkg.price, pkg.credits + pkg.bonusCredits, pkg.id, Date.now())
      .run();

    return NextResponse.json({
      orderId,
      amount: pkg.price,
      orderName: `BanaToon ${pkg.name} (${pkg.credits + pkg.bonusCredits} credits)`,
      customerName: user.nickname || 'BanaToon User',
      customerEmail: user.email || undefined,
    });
  } catch (err) {
    console.error('[Payments/Prepare] Error:', err);
    return NextResponse.json({ error: 'Failed to prepare payment' }, { status: 500 });
  }
}
