/**
 * 密码摘要：浏览器内计算 SHA-256，网络请求不携带明文密码。
 * 摘要前缀与后端 app/auth/digest.py 必须保持一致。
 * 使用纯 JS 实现，避免 HTTP 页面缺少 crypto.subtle。
 */

import { sha256Hex } from './sha256';

const DIGEST_PREFIX = 'lucky-picks:v1:';

/**
 * 计算登录摘要。
 * @param username 登录名（自动去除首尾空白）
 * @param password 明文密码
 * @returns 64 位小写十六进制摘要
 */
export const derivePasswordDigest = async (
  username: string,
  password: string,
): Promise<string> => sha256Hex(`${DIGEST_PREFIX}${username.trim()}:${password}`);
