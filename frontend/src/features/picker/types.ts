/**
 * 选号领域公共类型定义。
 * 所有核心逻辑（生成、组合、分析）只依赖这些类型，不依赖 React 或浏览器 API。
 */

/** 支持的玩法标识。 */
export type GameId = 'redblue' | 'frontback';

/** 号码区域标识：红蓝玩法为 red/blue，前后玩法为 front/back。 */
export type AreaKey = 'red' | 'blue' | 'front' | 'back';

/** 选号模式：机选、复式、胆拖。 */
export type SelectionMode = 'quick' | 'multiple' | 'banker';

/** 机选策略：纯随机、均衡分布。 */
export type QuickStrategy = 'random' | 'balanced';

/** 单个号码区域的规则。 */
export interface BallArea {
  /** 区域标识，用于取值与样式映射。 */
  key: AreaKey;
  /** 展示名称，例如「红球」。 */
  label: string;
  /** 最小编号（含）。 */
  min: number;
  /** 最大编号（含）。 */
  max: number;
  /** 单注基础号码个数。 */
  count: number;
  /** 球的颜色语义，仅用于展示。 */
  color: 'red' | 'blue';
}

/** 玩法完整规则。 */
export interface GameConfig {
  /** 玩法标识。 */
  id: GameId;
  /** 玩法名称。 */
  name: string;
  /** 规则说明文案。 */
  description: string;
  /** 号码区域列表，第一个区域视为「主区」，用于分布分析。 */
  areas: readonly BallArea[];
}

/** 号码集合：区域标识到升序号码数组的映射。 */
export type TicketNumbers = Partial<Record<AreaKey, number[]>>;

/** 一注号码的分布分析结果（仅针对主区）。 */
export interface TicketAnalysis {
  /** 奇偶比，例如 3:3。 */
  oddEven: string;
  /** 大小比，例如 3:3。 */
  bigSmall: string;
  /** 主区号码和值。 */
  sum: number;
  /** 三区分布，例如 2:2:2。 */
  zones: string;
}

/** 历史记录：一次生成/保存的批次。 */
export interface HistoryRecord {
  /** 记录唯一标识。 */
  id: string;
  /** 玩法标识。 */
  gameId: GameId;
  /** 玩法名称快照，避免规则调整后历史显示错乱。 */
  gameName: string;
  /** 生成模式。 */
  mode: SelectionMode;
  /** 该批次包含的号码，复式可能只有一条但组合数大于 1。 */
  tickets: TicketNumbers[];
  /** 组合注数（复式的组合数或机选的注数）。 */
  combinationCount: number;
  /** 保存时的参考金额快照（元），避免后续调价影响历史展示。 */
  amount?: number;
  /** 创建时间戳（毫秒）。 */
  createdAt: number;
  /** 保存时是否因数量上限截断了号码（仅保存预览，组合注数仍为真实值）。 */
  ticketsTruncated?: boolean;
}

/** 参数校验错误，携带可直接展示给用户的中文信息。 */
export class SelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SelectionError';
  }
}
