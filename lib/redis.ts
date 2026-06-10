import { Redis } from '@upstash/redis';

// Upstash Redis 客户端（免费层 10K 命令/天）
export function getRedis() {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    throw new Error('缺少 Upstash Redis 环境变量，请在 Vercel 中配置');
  }

  return new Redis({ url, token });
}

// Key 前缀
export const KEY_PREFIX = 'license:';
export const USED_KEYS_SET = 'license:used';

// 存储结构
export interface LicenseRecord {
  key: string;
  email: string;
  orderId: string;        // 爱发电订单号
  createdAt: number;
  activatedAt?: number;
  activatedBy?: string;  // 激活的设备 ID 或用户标识
  isValid: boolean;
}
