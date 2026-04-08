import { type HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: 'accent' | 'success' | 'warning' | 'error' | 'info'
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  accent: 'bg-accent-subtle-strong text-accent border-strong',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export function Badge({ children, variant = 'accent', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5',
        'px-2.5 py-1',
        'text-xs font-medium tracking-wide uppercase',
        'rounded-full border',
        variantStyles[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}
