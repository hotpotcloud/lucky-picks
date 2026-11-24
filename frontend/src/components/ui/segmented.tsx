import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SegmentedValue = string | number;

interface SegmentedOption {
  label: ReactNode;
  value: SegmentedValue;
}

interface SegmentedProps {
  value: SegmentedValue;
  onChange: (value: SegmentedValue) => void;
  options: SegmentedOption[];
  label?: string;
}

/** 无依赖的分段选择控件。 */
export const Segmented = ({ value, onChange, options, label }: SegmentedProps) => (
  <div
    role="group"
    aria-label={label}
    className="grid gap-1 rounded-md border border-slate-700 bg-slate-950/70 p-1 sm:grid-flow-col sm:auto-cols-fr"
  >
    {options.map((option) => {
      const isSelected = option.value === value;
      return (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={isSelected}
          className={cn(
            'min-h-9 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
            isSelected
              ? 'bg-emerald-400 text-slate-950'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
