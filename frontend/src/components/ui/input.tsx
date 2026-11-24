import * as React from 'react';
import { cn } from '../../lib/utils';


/**
 * 科技风输入框（shadcn 风格）。
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--ring)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--card)] disabled:text-[var(--text-disabled)] disabled:opacity-100',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
