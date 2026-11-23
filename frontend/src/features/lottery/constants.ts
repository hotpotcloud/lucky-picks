/**
 * 业务常量集中管理，避免魔法数字散落在组件与算法中。
 */

/** 单注参考金额（元），仅用于展示，不涉及真实交易。 */
export const TICKET_PRICE = 2;

/** 单次生成允许的最大组合注数，防止浏览器被大量枚举卡死。 */
export const MAX_TICKETS = 1000;

/** 机选注数下限。 */
export const QUICK_PICK_MIN = 1;

/** 机选注数上限。 */
export const QUICK_PICK_MAX = 10;

/** 均衡策略的候选采样次数，越大越均衡但耗时略高。 */
export const BALANCED_SAMPLE_SIZE = 500;

/** 历史记录保留上限，避免 localStorage 无限增长。 */
export const MAX_HISTORY_RECORDS = 50;

/** 结果区最多直接渲染的注数，超出部分用文字提示。 */
export const MAX_RENDERED_TICKETS = 20;

/** 单条历史记录最多保存的号码注数，避免 localStorage 超配额。 */
export const MAX_HISTORY_TICKETS = 200;

/** 本地历史存储键。 */
export const HISTORY_STORAGE_KEY = 'lucky-picks:history:v1';
