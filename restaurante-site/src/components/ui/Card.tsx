import { type HTMLAttributes } from 'react'

type CardVariant = 'default' | 'elevated' | 'outlined' | 'accent'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: CardVariant
  padding?: 'sm' | 'md' | 'lg' | 'none'
  className?: string
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface border border-border',
  elevated: 'bg-surface shadow-xl border border-border',
  outlined: 'bg-transparent border-2 border-strong',
  accent: 'bg-accent-subtle border border-strong',
}

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        variantStyles[variant],
        padding !== 'none' ? paddingStyles[padding] : '',
        'rounded-xl',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
