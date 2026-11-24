/** 智能推荐：策略、参数和真实接口结果展示。 */

import { Cpu, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, EmptyState, Notice } from '../../components/ui/feedback';
import { Input } from '../../components/ui/input';
import { Segmented } from '../../components/ui/segmented';
import type { DrawItem } from '../data/useDraws';
import NumberBall from '../picker/components/NumberBall';
import { useRecommendPanelLogic } from './useRecommendPanelLogic';

const STRATEGIES = [
  { label: '均衡', value: 'balanced' },
  { label: '热号', value: 'hot' },
  { label: '冷号', value: 'cold' },
  { label: '遗漏', value: 'omission' },
  { label: '综合', value: 'bayesian' },
];

interface RecommendPanelProps {
  game: string;
  draws: DrawItem[];
}

const RecommendPanel = ({ game }: RecommendPanelProps) => {
  const logic = useRecommendPanelLogic(game);

  return (
    <Card className="border-slate-700 bg-[#11161d] shadow-none">
      <CardHeader className="gap-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <Cpu className="text-emerald-300" size={18} />
            智能推荐
          </CardTitle>
          <Badge tone="info">真实数据</Badge>
        </div>
        <p className="m-0 text-sm text-slate-400">配置策略与随机种子，结果由推荐服务生成。</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <Segmented
          label="推荐策略"
          options={STRATEGIES}
          value={logic.strategy}
          onChange={(value) => logic.setStrategy(String(value))}
        />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="space-y-2 text-sm text-slate-300">
            <span>推荐注数</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={logic.count}
              onChange={(event) => logic.handleCountChange(Number(event.target.value))}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>随机种子</span>
            <Input
              type="number"
              min={1}
              placeholder="留空随机"
              value={logic.seed ?? ''}
              onChange={(event) => logic.handleSeedChange(event.target.value)}
            />
          </label>
          <Button
            className="h-11 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            disabled={logic.isLoading}
            onClick={() => void logic.handleGenerate()}
          >
            <Sparkles size={16} />
            {logic.isLoading ? '生成中...' : '生成推荐'}
          </Button>
        </div>
        {logic.error && <Notice tone="error">{logic.error}</Notice>}
        {logic.bets.length === 0 ? (
          <EmptyState title="等待生成推荐" description="选择策略后生成 1-10 注推荐结果。" />
        ) : (
          <div className="space-y-2">
            {logic.bets.map((bet, index) => (
              <div
                className="flex flex-wrap items-center gap-3 border-b border-slate-800 py-3 last:border-0"
                key={`${logic.strategy}-${index}`}
              >
                <span className="w-7 font-mono text-xs text-slate-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-1 flex-wrap gap-1">
                  {bet.areas.flatMap((area) =>
                    area.numbers.map((number) => (
                      <NumberBall
                        key={`${area.key}-${number}`}
                        value={number}
                        color={area.key === 'red' || area.key === 'front' ? 'red' : 'blue'}
                      />
                    )),
                  )}
                </div>
                <Badge>{logic.strategy}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendPanel;
