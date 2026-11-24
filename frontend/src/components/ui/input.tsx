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
      'flex h-11 w-full rounded-md border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-sm text-cyan-50 placeholder:text-slate-500 backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:border-cyan-400/60',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
