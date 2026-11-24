import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import type { BallArea } from '../types';
import type { QuickConstraints } from '../constraints';
import { createEmptyQuickConstraints, parseOptionalInteger } from '../constraints';

/** 手动条件面板属性。 */
interface QuickConstraintsPanelProps {
  primaryArea: BallArea;
  value: QuickConstraints;
  onChange: (value: QuickConstraints) => void;
}

/** 单式机选可选手动条件，只收集输入，不处理请求。 */
const QuickConstraintsPanel = ({
  primaryArea,
  value,
  onChange,
}: QuickConstraintsPanelProps) => {
  const parseInput = (rawValue: string, onValid: (value: number | null) => void) => {
    const parsed = parseOptionalInteger(rawValue);
    if (parsed !== undefined) {
      onValid(parsed);
    }
  };

  const updateZone = (index: number, count: number | null) => {
    const zoneCounts: QuickConstraints['zoneCounts'] = [...value.zoneCounts];
    zoneCounts[index] = count;
    onChange({ ...value, zoneCounts });
  };

  return (
    <div className="space-y-3 rounded-lg border border-cyan-400/20 bg-slate-950/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-100">手动条件（可选）</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(createEmptyQuickConstraints())}
        >
          清除
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
        <label className="text-sm text-slate-300" htmlFor="quick-odd-count">
          奇:偶
        </label>
        <Input
          id="quick-odd-count"
          type="number"
          placeholder="奇数"
          min={0}
          max={primaryArea.count}
          step={1}
          value={value.oddCount ?? ''}
          onChange={(event) =>
            parseInput(event.target.value, (oddCount) => onChange({ ...value, oddCount }))
          }
        />
        <span className="text-sm text-slate-400">
          {value.oddCount === null ? '偶数自动计算' : `:${primaryArea.count - value.oddCount}`}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
        <label className="text-sm text-slate-300" htmlFor="quick-big-count">
          大:小
        </label>
        <Input
          id="quick-big-count"
          type="number"
          placeholder="大数"
          min={0}
          max={primaryArea.count}
          step={1}
          value={value.bigCount ?? ''}
          onChange={(event) =>
            parseInput(event.target.value, (bigCount) => onChange({ ...value, bigCount }))
          }
        />
        <span className="text-sm text-slate-400">
          {value.bigCount === null ? '小数自动计算' : `:${primaryArea.count - value.bigCount}`}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-center">
        <label className="text-sm text-slate-300" htmlFor="quick-sum">
          和值
        </label>
        <Input
          id="quick-sum"
          type="number"
          placeholder="留空不限制"
          step={1}
          value={value.sum ?? ''}
          onChange={(event) =>
            parseInput(event.target.value, (sum) => onChange({ ...value, sum }))
          }
        />
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-start">
        <legend className="text-sm text-slate-300">一区:二区:三区</legend>
        <div className="grid grid-cols-3 gap-2">
          {value.zoneCounts.map((zoneCount, index) => {
            const inputId = `quick-zone-${index + 1}`;
            return (
              <div className="space-y-1" key={inputId}>
                <label className="text-xs text-slate-400" htmlFor={inputId}>
                  {`${index + 1}区`}
                </label>
                <Input
                  id={inputId}
                  type="number"
                  min={0}
                  max={primaryArea.count}
                  step={1}
                  value={zoneCount ?? ''}
                  onChange={(event) =>
                    parseInput(event.target.value, (count) => updateZone(index, count))
                  }
                />
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};

export default QuickConstraintsPanel;
