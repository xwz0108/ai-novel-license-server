import { verifyLicense, getLicense } from '../lib/keys';

/**
 * POST /api/verify
 * Body: { key: string, deviceId: string }
 * Returns: { valid: boolean, type?: string, expiresAt?: string, credits?: number, reason?: string }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, deviceId } = req.body || {};
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ valid: false, reason: 'missing_key' });
  }

  try {
    const { valid, record, reason } = await verifyLicense(key.trim(), deviceId || 'default');

    if (!valid || !record) {
      return res.status(200).json({
        valid: false,
        reason: reason || 'invalid',
      });
    }

    return res.status(200).json({
      valid: true,
      type: record.type,
      expiresAt: record.expiresAt,
      credits: record.type === 'credits' ? record.credits : undefined,
      deviceCount: record.devices.length,
      deviceLimit: record.deviceLimit,
    });
  } catch (err: any) {
    console.error('[verify] error:', err);
    return res.status(500).json({ valid: false, reason: 'server_error' });
  }
}
