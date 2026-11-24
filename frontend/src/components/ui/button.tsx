import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/** 本地 shadcn 按钮：所有页面共用语义主题与焦点反馈。 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:border-[var(--border)] disabled:bg-[var(--card-raised)] disabled:text-[var(--text-disabled)] disabled:opacity-100',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_2px_12px_rgba(45,212,191,0.10)] hover:bg-[var(--primary-hover)]',
        outline:
          'border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--muted-foreground)] hover:bg-[var(--accent)]',
        ghost: 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'min-h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

/** 按钮属性。 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 是否渲染为子元素（Radix Slot）。 */
  asChild?: boolean;
}

/**
 * 科技风按钮组件。
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
