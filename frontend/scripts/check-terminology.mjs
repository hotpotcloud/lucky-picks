/**
 * 术语合规检查：确保仓库内不出现受限字样。
 *
 * 受限内容：
 * - 任何含受限汉字的表达（对应真实游戏名、彩票/福彩/体彩等），此处以 Unicode 转义书写；
 * - 真实游戏名的英文写法（Double Color Ball / Super Lotto / Union Lotto）；
 * - 我们自己撰写的英文 "lottery" 表述。
 *
 * 例外（外部专有名词，无法重命名且非产品文案）：
 * - 第三方仓库名（如 .../tf-lottery、.../LotteryTrend）；
 * - 官方来源域名与上游接口字段名（如 lottery.gov.cn、lotteryDrawNum）。
 *
 * 用法：node scripts/check-terminology.mjs
 * 退出码：0 = 通过；1 = 存在违规。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

/** 仓库根目录（本脚本位于 frontend/scripts 下）。 */
const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

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

/** 扫描时跳过的文件（本检查脚本自身包含受限模式的写法）。 */
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

/** 受限汉字（Unicode 转义，避免脚本自身出现该字面量）。 */
const RESTRICTED_HANZI = '\u5f69';

/** 受限模式。 */
const BANNED_PATTERNS = [
  { name: '受限汉字表达', regex: new RegExp(RESTRICTED_HANZI) },
  { name: '英文游戏名 Double Color Ball', regex: /double[\s-]?color[\s-]?ball/i },
  { name: '英文游戏名 Super Lotto', regex: /super[\s-]?lotto/i },
  { name: '英文游戏名 Union Lotto', regex: /union[\s-]?lotto/i },
  { name: '英文 lottery 表述', regex: /lottery/i },
];

/**
 * 例外规则：命中即视为外部专有名词，不算违规。
 * 只允许「明确列出的第三方仓库名」「官方域名」「上游接口字段名」三类，
 * 我们自己撰写的同义写法仍会被拦截。
 */
const ALLOW_LITERALS = [
  'Double-Color-Ball-AI',
  'UnionLotto',
  'LotteryTrend',
  'Miracle_Lottery',
  'tf-lottery',
  'lotterygrabber',
  'lottery-ai-simulator',
  'LotteryPrediction',
  'Liang-yc/ssq',
  'daletou-predictor',
  'lucky_ball',
  'AaronJny/lotto',
  'MachineSelection',
];

const ALLOW_PATTERNS = [
  /lotteryDraw/i,
  /lottery\.gov\.cn/i,
  /sporttery\.cn/i,
  /cwl\.gov\.cn/i,
];

/**
 * 判断一行是否命中例外规则。
 * @param {string} line 待检查的文本行
 * @returns {boolean} 是否属于允许的外部专有名词
 */
const isAllowed = (line) => {
  const lowered = line.toLowerCase();
  const literalHit = ALLOW_LITERALS.some((literal) => lowered.includes(literal.toLowerCase()));
  return literalHit || ALLOW_PATTERNS.some((pattern) => pattern.test(line));
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
    for (const { name, regex } of BANNED_PATTERNS) {
      if (regex.test(line) && !isAllowed(line)) {
        violations.push({
          file: relative(REPO_ROOT, file),
          line: index + 1,
          rule: name,
          text: line.trim().slice(0, 120),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error('术语合规检查失败，发现以下受限字样：\n');
  for (const item of violations) {
    console.error(`  ${item.file}:${item.line} [${item.rule}] ${item.text}`);
  }
  console.error('\n请使用中性术语（红蓝玩法 / 前后玩法 / 选号 / 官方数据源 A|B）改写。');
  process.exit(1);
}

console.log('术语合规检查通过：未发现受限字样。');
