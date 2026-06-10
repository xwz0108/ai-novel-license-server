import { createLicense, getLicense } from '../lib/keys';

const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme';

/**
 * POST /api/generate
 * Body: { adminKey: string, type: 'lifetime' | 'subscription' | 'credits', userId: string, credits?: number, days?: number }
 * Returns: { success: boolean, key?: string, record?: any }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminKey, type, userId, credits, days } = req.body || {};

  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ success: false, reason: 'unauthorized' });
  }

  if (!type || !userId) {
    return res.status(400).json({ success: false, reason: 'missing_params' });
  }

  if (type === 'credits' && !credits) {
    return res.status(400).json({ success: false, reason: 'credits_required' });
  }

  try {
    const record = await createLicense(type, userId, { credits, days });
    return res.status(200).json({
      success: true,
      key: record.key,
      type: record.type,
      credits: record.credits,
      expiresAt: record.expiresAt,
    });
  } catch (err: any) {
    console.error('[generate] error:', err);
    return res.status(500).json({ success: false, reason: 'server_error' });
  }
}
