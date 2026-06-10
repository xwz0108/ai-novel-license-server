import CryptoJS from 'crypto-js';
import type { LicenseRecord } from './redis';

const SECRET = process.env.LICENSE_SECRET || 'change-this-secret-key';

// 生成 License Key（格式：XXXX-XXXX-XXXX-XXXX）
export function generateKey(email: string, orderId: string): string {
  // 生成 3 组随机数据（各 4 位十六进制）
  const part1 = CryptoJS.lib.WordArray.random(2).toString();
  const part2 = CryptoJS.lib.WordArray.random(2).toString();
  const part3 = CryptoJS.lib.WordArray.random(2).toString();
  
  // 用 HMAC 生成校验位（8 位十六进制）
  const payload = `${email}:${orderId}:${part1}${part2}${part3}`;
  const signature = CryptoJS.HmacSHA256(payload, SECRET).toString().slice(0, 8);
  const part4 = signature.slice(0, 4).toUpperCase();
  
  return `${part1.slice(0, 4).toUpperCase()}-${part2.slice(0, 4).toUpperCase()}-${part3.slice(0, 4).toUpperCase()}-${part4}`;
}

// 验证 License Key 格式和签名
export function verifyKeyFormat(key: string): boolean {
  const parts = key.split('-');
  if (parts.length !== 4) return false;
  
  const data = parts.slice(0, 3).join('');
  const signature = parts[3];
  
  // 重新计算签名进行验证
  // 注意：完整的验证需要 email + orderId，这里只做格式校验
  // 完整验证在 API 中通过查询 Redis 完成
  return /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(key);
}

// 创建 License 记录
export function createLicenseRecord(email: string, orderId: string): LicenseRecord {
  const key = generateKey(email, orderId);
  return {
    key,
    email,
    orderId,
    createdAt: Date.now(),
    isValid: true,
  };
}
