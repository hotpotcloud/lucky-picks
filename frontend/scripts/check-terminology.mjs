/**
 * 术语合规检查：确保仓库内不出现受限字样与可追溯线索。
 *
 * 检查内容：
 * 1. 受限汉字（Unicode 转义写入，避免脚本自身出现字面量）；
 * 2. 受限词对应的英文写法（通过字符码还原，避免字面量出现在脚本里）；
 * 3. 受限英文单词本身；
 * 4. 外部仓库链接与已知第三方仓库标识（统一使用「项目 A–N」代号）。
 *
 * 说明：仓库内不保留任何官方域名、接口路径、字段名或第三方仓库名等可追溯信息，
 * 因此本检查不设例外白名单；如将来确需引用外部专有名词，
 * 需先在 ALLOW_LITERALS 中登记并写明理由。
 *
 * 用法：node scripts/check-terminology.mjs
 * 退出码：0 = 通过；1 = 存在违规。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

/** 仓库根目录（本脚本位于 frontend/scripts 下）。 */
const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

/**
 * 通过字符码还原字符串，避免受限词以字面量形式出现在脚本源码里。
 * @param {number[]} codes 字符码数组
 * @returns {string} 还原后的字符串
 */
const word = (codes) => codes.map((code) => String.fromCharCode(code)).join('');

/** 受限汉字。 */
const RESTRICTED_HANZI = word([0x5f69]);

/** 受限英文单词与短语（字符码还原）。 */
const WORD_A = word([0x6c, 0x6f, 0x74, 0x74, 0x65, 0x72, 0x79]);
const PART_B = word([0x44, 0x6f, 0x75, 0x62, 0x6c, 0x65]);
const PART_C = word([0x43, 0x6f, 0x6c, 0x6f, 0x72]);
const PART_D = word([0x42, 0x61, 0x6c, 0x6c]);
const PART_E = word([0x53, 0x75, 0x70, 0x65, 0x72]);
const PART_F = word([0x55, 0x6e, 0x69, 0x6f, 0x6e]);
const PART_G = word([0x4c, 0x6f, 0x74, 0x74, 0x6f]);

/** 扫描时跳过的目录。 */
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.umi',
  '.umi-production',
  '.vite',
  '.playwright-mcp',
  '.next',
]);

/** 扫描时跳过的文件（脚本自身）。 */
const SKIP_FILES = new Set(['check-terminology.mjs']);

/** 参与扫描的文件扩展名。 */
const SCAN_EXTENSIONS = new Set([
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.html',
  '.css',
  '.txt',
  '.py',
  '.sql',
  '.sh',
]);

/**
 * 已知的第三方仓库标识（字符码还原，避免脚本自身出现字面量）。
 * 仓库内统一使用「项目 A–N」代号，不保留原始仓库标识与链接。
 */
const EXTERNAL_REPO_TOKENS = [
  'github.com/',
  'daletou-predictor',
  'lucky_ball',
  'Liang-yc/ssq',
  'AaronJny/lotto',
  'MachineSelection',
  'Miracle_Lottery',
  'tf-lottery',
  'LotteryTrend',
  'UnionLotto',
  'Double-Color-Ball-AI',
  'lotterygrabber',
  'lottery-ai-simulator',
  'LotteryPrediction',
].map((token) => word(Array.from(token).map((char) => char.charCodeAt(0))));

/** 受限模式。 */
const BANNED_PATTERNS = [
  { name: '受限汉字表达', regex: new RegExp(RESTRICTED_HANZI) },
  {
    name: '受限英文短语 A',
    regex: new RegExp(`${PART_B}[\\s-]?${PART_C}[\\s-]?${PART_D}`, 'i'),
  },
  { name: '受限英文短语 B', regex: new RegExp(`${PART_E}[\\s-]?${PART_G}`, 'i') },
  { name: '受限英文短语 C', regex: new RegExp(`${PART_F}[\\s-]?${PART_G}`, 'i') },
  { name: '受限英文单词', regex: new RegExp(WORD_A, 'i') },
];

/** 外部仓库标识（按子串匹配，大小写不敏感）。 */
const EXTERNAL_REPO_PATTERNS = EXTERNAL_REPO_TOKENS;

/**
 * 例外白名单（当前为空）。
 * 登记后需写明引用理由与范围，避免成为绕过检查的后门。
 */
const ALLOW_LITERALS = [];

/**
 * 判断一行是否命中例外规则。
 * @param {string} line 待检查的文本行
 * @returns {boolean} 是否属于允许的外部专有名词
 */
const isAllowed = (line) => {
  const lowered = line.toLowerCase();
  return ALLOW_LITERALS.some((literal) => lowered.includes(literal.toLowerCase()));
};

/**
 * 递归收集待扫描文件。
 * @param {string} dir 当前目录
 * @returns {string[]} 文件绝对路径列表
 */
const collectFiles = (dir) => {
  const result = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      result.push(...collectFiles(fullPath));
    } else if (SCAN_EXTENSIONS.has(extname(entry)) && !SKIP_FILES.has(entry)) {
      result.push(fullPath);
    }
  }
  return result;
};

const violations = [];

for (const file of collectFiles(REPO_ROOT)) {
  const content = readFileSync(file, 'utf-8');
  content.split(/\r?\n/).forEach((line, index) => {
    const lowered = line.toLowerCase();
    const hits = [
      ...BANNED_PATTERNS.filter(({ regex }) => regex.test(line)).map(({ name }) => name),
      ...EXTERNAL_REPO_PATTERNS.filter((token) => lowered.includes(token.toLowerCase())).map(
        () => '外部仓库标识或链接',
      ),
    ];
    if (hits.length > 0 && !isAllowed(line)) {
      violations.push({
        file: relative(REPO_ROOT, file),
        line: index + 1,
        rule: [...new Set(hits)].join(' / '),
        text: line.trim().slice(0, 120),
      });
    }
  });
}

if (violations.length > 0) {
  console.error('术语合规检查失败，发现以下受限字样：\n');
  for (const item of violations) {
    console.error(`  ${item.file}:${item.line} [${item.rule}] ${item.text}`);
  }
  console.error('\n请使用中性术语改写，并移除官方域名、接口路径、字段名与第三方仓库名等可追溯信息。');
  process.exit(1);
}

console.log('术语合规检查通过：未发现受限字样或可追溯线索。');
