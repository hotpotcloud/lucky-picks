/**
 * 密码摘要：浏览器内计算 SHA-256，网络请求不携带明文密码。
 * 摘要前缀与后端 app/auth/digest.py 必须保持一致。
 */

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
): Promise<string> => {
  const payload = new TextEncoder().encode(`${DIGEST_PREFIX}${username.trim()}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};
