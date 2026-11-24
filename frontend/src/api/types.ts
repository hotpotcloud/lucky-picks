/** 后端接口返回类型（与 docs/contracts/openapi.yaml 对齐）。 */

export interface LoginResponse {
  token: string;
  expiredAt: number;
  user: { id: number; username: string; role: string };
}

export interface Envelope<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

export interface DrawDto {
  game: string;
  issue: string;
  date: string;
  numbers: Record<string, number[]>;
  sales: number | null;
  pool: number | null;
}

export interface DrawPage {
  items: DrawDto[];
  total: number;
  limit: number;
  offset: number;
  meta: { version: string; updatedAt: string; source: string; drawCount: number };
}

export interface NumberStatDto {
  number: number;
  count: number;
  frequency: number;
  expectedCount: number;
  zScore: number;
  currentOmission: number;
  maxOmission: number;
  avgOmission: number;
  expectedGap: number;
  omissionRatio: number;
  posteriorMean: number;
}

export interface StatsDto {
  game: string;
  window: number;
  numbers: NumberStatDto[];
  drawMetrics: Array<Record<string, unknown>>;
  uniformity: { chiSquare: number; pValue: number; conclusion: string };
  latestIssue: string;
  latestDate: string;
}

export interface BetDto {
  mode: string;
  areas: Array<{ key: string; numbers: number[]; banker: number[] }>;
  combinations: number;
  baseAmount: number;
  additionalAmount: number;
  totalAmount: number;
  explanation: Array<{ number: number; feature: string; weight: number; value: number }>;
}

export interface RecommendationDto {
  game: string;
  strategy: string;
  mode: string;
  window: number;
  seed: number | null;
  bets: BetDto[];
  dataVersion: string;
}

/** AI 分析结果。 */
export interface AiAnalysisDto {
  /** 使用的模型（固定 deepseek-v4.1-flash）。 */
  model: string;
  /** 分析正文。 */
  content: string;
  /** 风险提示。 */
  disclaimer: string;
}

/** AI 对话消息。 */
export interface ChatMessageDto {
  /** 消息角色。 */
  role: 'system' | 'user' | 'assistant';
  /** 消息正文。 */
  content: string;
}

/** AI 对话结果。 */
export interface ChatReplyDto {
  /** 实际使用的模型。 */
  model: string;
  /** 回复正文。 */
  content: string;
  /** 风险提示。 */
  disclaimer: string;
}
