import crypto from 'crypto';
import { createLicense, getLicense } from '../lib/keys';

const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID || '';
const AFDIAN_API_KEY = process.env.AFDIAN_API_KEY || '';

interface AfdianOrder {
  order_id: string;
  user_id: string;
  plan_id: string;
  amount: number;      // in cents
  status: number;      // 2 = paid
  [key: string]: any;
}

/**
 * Verify Afdian webhook signature
 * Sign algorithm: md5(api_key + order_id + user_id + amount)
 */
function verifySign(order: AfdianOrder): boolean {
  const raw = AFDIAN_API_KEY + order.order_id + order.user_id + order.amount;
  const sign = crypto.createHash('md5').update(raw).digest('hex');
  return sign === order.sign;
}

/**
 * Map Afdian plan_id to license type and duration
 * You need to configure this mapping based on your Afdian plans
 */
function getPlanConfig(planId: string): { type: 'lifetime' | 'subscription' | 'credits'; days?: number; credits?: number } {
  // Example mapping - adjust based on your actual Afdian plans
  const plans: Record<string, { type: 'lifetime' | 'subscription' | 'credits'; days?: number; credits?: number }> = {
    'plan_month': { type: 'subscription', days: 30 },
    'plan_year': { type: 'subscription', days: 365 },
    'plan_lifetime': { type: 'lifetime' },
    'plan_credits_500': { type: 'credits', credits: 500 },
    'plan_credits_1800': { type: 'credits', credits: 1800 },
  };
  return plans[planId] || { type: 'subscription', days: 30 };
}

/**
 * POST /api/afdian-webhook
 * Afdian sends POST request when order is paid
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const { order, sign } = body;

    if (!order || !sign) {
      return res.status(400).json({ success: false, reason: 'missing_params' });
    }

    // Verify signature
    if (!verifySign(order)) {
      console.error('[afdian] invalid signature', order.order_id);
      return res.status(403).json({ success: false, reason: 'invalid_signature' });
    }

    // Check order status (2 = paid)
    if (order.status !== 2) {
      return res.status(200).json({ success: true, reason: 'order_not_paid' });
    }

    const userId = String(order.user_id);
    const planId = String(order.plan_id);
    const config = getPlanConfig(planId);

    // Check if this order was already processed (idempotency)
    const existingKey = await getLicenseByOrderId(order.order_id);
    if (existingKey) {
      return res.status(200).json({ success: true, key: existingKey, reused: true });
    }

    // Create license
    const record = await createLicense(config.type, userId, {
      credits: config.credits,
      days: config.days,
    });

    // Store order->key mapping for idempotency
    await set(`order:${order.order_id}`, record.key, { ex: 86400 * 365 });

    console.log(`[afdian] created license ${record.key} for user ${userId}, order ${order.order_id}`);

    return res.status(200).json({
      success: true,
      key: record.key,
      type: record.type,
      expiresAt: record.expiresAt,
      credits: record.credits,
    });

  } catch (err: any) {
    console.error('[afdian] error:', err);
    return res.status(500).json({ success: false, reason: 'server_error' });
  }
}

// Helper: get license key by order ID
async function getLicenseByOrderId(orderId: string): Promise<string | null> {
  const { get } from '../lib/redis';
  return get(`order:${orderId}`);
}

// Helper: set key with expiration
async function set(key: string, value: string, opts?: { ex?: number }): Promise<'OK'> {
  const { set: redisSet } from '../lib/redis';
  return redisSet(key, value, opts);
}
