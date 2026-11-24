import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type FeedbackTone = 'error' | 'warning' | 'info' | 'success';

const toneClasses: Record<FeedbackTone, string> = {
  error: 'border-rose-400/35 bg-rose-400/10 text-rose-100',
  warning: 'border-amber-400/35 bg-amber-400/10 text-amber-100',
  info: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-100',
  success: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100',
};

interface NoticeProps {
  children: ReactNode;
  tone: FeedbackTone;
}

/** 用于表单与异步状态的内联反馈。 */
export const Notice = ({ children, tone }: NoticeProps) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn('rounded-md border px-3 py-2 text-sm leading-6', toneClasses[tone])}
  >
    {children}
  </div>
);

interface BadgeProps {
  children: ReactNode;
  tone?: FeedbackTone | 'neutral';
}

const badgeToneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  ...toneClasses,
  neutral: 'border-[var(--border)] bg-[var(--card-raised)] text-muted-foreground',
};

/** 紧凑状态标记。 */
export const Badge = ({ children, tone = 'neutral' }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex min-h-6 items-center rounded border px-2 py-0.5 text-xs font-medium',
      badgeToneClasses[tone],
    )}
  >
    {children}
  </span>
);

interface EmptyStateProps {
  title: string;
  description?: string;
}

/** 面板空状态。 */
export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--input)] px-5 py-8 text-center">
    <p className="m-0 text-sm font-medium text-[var(--foreground)]">{title}</p>
    {description && <p className="mb-0 mt-2 text-sm text-muted-foreground">{description}</p>}
  </div>
);
