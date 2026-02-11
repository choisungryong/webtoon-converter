import { generateUUID } from '../utils/commonUtils';

// ---------- Cost definitions ----------

export const CREDIT_COSTS = {
  basic_convert: 1,
  premium_convert: 3,
  episode_generate: 2,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ---------- Constants ----------

const DAILY_FREE_CREDITS = 3;
const SIGNUP_BONUS_CREDITS = 10;
const ANONYMOUS_DAILY_LIMIT = 3;

// KST midnight reset
function getKSTMidnight(): number {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCHours(15, 0, 0, 0); // 15:00 UTC = 00:00 KST next day
  if (kst.getTime() <= now.getTime()) {
    kst.setUTCDate(kst.getUTCDate() + 1);
  }
  // Return the last midnight
  return kst.getTime() - 24 * 60 * 60 * 1000;
}

// ---------- Balance check + deduction (atomic with D1 batch) ----------

export interface DeductResult {
  success: boolean;
  freeCredits: number;
  paidCredits: number;
  error?: string;
}

/**
 * Check and deduct credits atomically.
 * For authenticated users: uses free_credits + paid_credits from users table.
 * For anonymous users: uses usage_logs table with daily limit.
 */
export async function checkAndDeductCredits(
  db: any,
  opts: {
    userId: string | null; // authenticated user ID
    legacyUserId: string; // localStorage UUID
    isAuthenticated: boolean;
    cost: number;
    reason: string;
    referenceId?: string;
  },
): Promise<DeductResult> {
  // Anonymous user: fallback to usage_logs counting
  if (!opts.isAuthenticated || !opts.userId) {
    return checkAnonymousLimit(db, opts.legacyUserId, opts.cost, opts.reason);
  }

  // Authenticated user: check credits
  const user = await db
    .prepare(`SELECT free_credits, paid_credits, free_credits_reset_at FROM users WHERE id = ?`)
    .bind(opts.userId)
    .first();

  if (!user) {
    return { success: false, freeCredits: 0, paidCredits: 0, error: 'USER_NOT_FOUND' };
  }

  let freeCredits = (user.free_credits as number) ?? 0;
  let paidCredits = (user.paid_credits as number) ?? 0;
  const resetAt = user.free_credits_reset_at as number | null;

  // Reset daily free credits if past KST midnight
  const lastMidnight = getKSTMidnight();
  if (!resetAt || resetAt < lastMidnight) {
    freeCredits = DAILY_FREE_CREDITS;
  }

  const totalCredits = freeCredits + paidCredits;
  if (totalCredits < opts.cost) {
    return {
      success: false,
      freeCredits,
      paidCredits,
      error: 'INSUFFICIENT_CREDITS',
    };
  }

  // Deduct: free first, then paid
  let remaining = opts.cost;
  let freeDeducted = 0;
  let paidDeducted = 0;

  if (freeCredits > 0) {
    freeDeducted = Math.min(freeCredits, remaining);
    remaining -= freeDeducted;
  }
  if (remaining > 0) {
    paidDeducted = remaining;
  }

  const newFree = freeCredits - freeDeducted;
  const newPaid = paidCredits - paidDeducted;
  const txId = generateUUID();

  // Atomic batch: update user + insert transaction log
  await db.batch([
    db
      .prepare(
        `UPDATE users SET free_credits = ?, paid_credits = ?, free_credits_reset_at = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(newFree, newPaid, Date.now(), Date.now(), opts.userId),
    db
      .prepare(
        `INSERT INTO credit_transactions (id, user_id, amount, credit_type, reason, reference_id, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        txId,
        opts.userId,
        -opts.cost,
        freeDeducted > 0 ? 'free' : 'paid',
        opts.reason,
        opts.referenceId || null,
        newFree + newPaid,
        Date.now(),
      ),
  ]);

  return { success: true, freeCredits: newFree, paidCredits: newPaid };
}

/** Anonymous users: daily limit using usage_logs */
async function checkAnonymousLimit(
  db: any,
  legacyUserId: string,
  cost: number,
  reason: string,
): Promise<DeductResult> {
  if (!db || !legacyUserId) {
    return { success: true, freeCredits: ANONYMOUS_DAILY_LIMIT, paidCredits: 0 };
  }

  try {
    const lastMidnight = getKSTMidnight();
    const result = (await db
      .prepare(
        `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at > ?`,
      )
      .bind(legacyUserId, lastMidnight)
      .first()) as any;

    const usedToday = result?.count || 0;
    const remaining = ANONYMOUS_DAILY_LIMIT - usedToday;

    if (remaining < cost) {
      return {
        success: false,
        freeCredits: Math.max(0, remaining),
        paidCredits: 0,
        error: 'ANONYMOUS_LIMIT_REACHED',
      };
    }

    return { success: true, freeCredits: remaining - cost, paidCredits: 0 };
  } catch {
    // Fail open for anonymous
    return { success: true, freeCredits: ANONYMOUS_DAILY_LIMIT, paidCredits: 0 };
  }
}

/** Refund credits on failure */
export async function refundCredits(
  db: any,
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<void> {
  const txId = generateUUID();

  const user = await db
    .prepare(`SELECT paid_credits FROM users WHERE id = ?`)
    .bind(userId)
    .first();
  if (!user) return;

  const newPaid = ((user.paid_credits as number) ?? 0) + amount;

  await db.batch([
    db
      .prepare(`UPDATE users SET paid_credits = ?, updated_at = ? WHERE id = ?`)
      .bind(newPaid, Date.now(), userId),
    db
      .prepare(
        `INSERT INTO credit_transactions (id, user_id, amount, credit_type, reason, reference_id, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(txId, userId, amount, 'paid', reason, referenceId || null, newPaid, Date.now()),
  ]);
}

/** Get user's credit balance (with daily reset check) */
export async function getCreditBalance(
  db: any,
  userId: string,
): Promise<{ free: number; paid: number; total: number }> {
  const user = await db
    .prepare(`SELECT free_credits, paid_credits, free_credits_reset_at FROM users WHERE id = ?`)
    .bind(userId)
    .first();

  if (!user) return { free: 0, paid: 0, total: 0 };

  let freeCredits = (user.free_credits as number) ?? 0;
  const paidCredits = (user.paid_credits as number) ?? 0;
  const resetAt = user.free_credits_reset_at as number | null;

  const lastMidnight = getKSTMidnight();
  if (!resetAt || resetAt < lastMidnight) {
    freeCredits = DAILY_FREE_CREDITS;
    // Update reset timestamp
    await db
      .prepare(`UPDATE users SET free_credits = ?, free_credits_reset_at = ? WHERE id = ?`)
      .bind(DAILY_FREE_CREDITS, Date.now(), userId)
      .run();
  }

  return { free: freeCredits, paid: paidCredits, total: freeCredits + paidCredits };
}

/** Grant signup bonus */
export async function grantSignupBonus(db: any, userId: string): Promise<void> {
  const txId = generateUUID();
  await db.batch([
    db
      .prepare(`UPDATE users SET paid_credits = paid_credits + ?, updated_at = ? WHERE id = ?`)
      .bind(SIGNUP_BONUS_CREDITS, Date.now(), userId),
    db
      .prepare(
        `INSERT INTO credit_transactions (id, user_id, amount, credit_type, reason, balance_after, created_at) VALUES (?, ?, ?, 'bonus', 'signup_bonus', ?, ?)`,
      )
      .bind(txId, userId, SIGNUP_BONUS_CREDITS, SIGNUP_BONUS_CREDITS, Date.now()),
  ]);
}
