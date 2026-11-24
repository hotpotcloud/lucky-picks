import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * shadcn 面板：实底、细边框，控制暗色界面的视觉层次。
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-[0_8px_28px_rgba(0,0,0,0.12)]',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

/** 卡片头部。 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

/** 卡片标题。 */
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('m-0 text-base font-semibold tracking-tight text-[var(--foreground)]', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

/** 卡片内容。 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
