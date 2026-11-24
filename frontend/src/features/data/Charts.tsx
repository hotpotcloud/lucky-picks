/** 数据图表兼容导出，便于现有页面逐步接入玩法配置。 */

import { REDBLUE_CONFIG } from '../picker/config';
import type { GameConfig } from '../picker/types';
import { FrequencyChart as FrequencyChartView } from './FrequencyChart';
import { OmissionTable as OmissionTableView } from './OmissionTable';
import { TrendGrid as TrendGridView } from './TrendGrid';
import type { DrawItem, StatsResult } from './useDraws';

export interface FrequencyChartProps {
  stats: StatsResult;
  game?: GameConfig;
}

export interface OmissionTableProps {
  stats: StatsResult;
}

export interface TrendGridProps {
  draws: DrawItem[];
  game?: GameConfig;
}

export const FrequencyChart = ({ stats, game = REDBLUE_CONFIG }: FrequencyChartProps) => (
  <FrequencyChartView stats={stats} game={game} />
);

export const OmissionTable = ({ stats }: OmissionTableProps) => (
  <OmissionTableView stats={stats} />
);

export const TrendGrid = ({ draws, game = REDBLUE_CONFIG }: TrendGridProps) => (
  <TrendGridView draws={draws} game={game} />
);

export type { FrequencySort } from './chartHelpers';
