'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

interface ButtonAsButton extends ButtonBaseProps {
  as?: 'button'
  href?: never
}

interface ButtonAsLink extends ButtonBaseProps {
  as: 'a'
  href: string
}

type ButtonProps = (ButtonAsButton | ButtonAsLink) &
  Omit<HTMLMotionProps<'button'>, 'children' | 'variant' | 'size' | 'fullWidth'>

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent text-background font-semibold',
    'hover:bg-accent-hover active:bg-accent-active',
    'shadow-glow hover:shadow-glow-lg',
    'transition-all duration-base',
  ].join(' '),
  secondary: [
    'bg-surface-light text-foreground font-medium',
    'border border-border hover:border-strong',
    'hover:bg-surface-elevated',
    'transition-all duration-base',
  ].join(' '),
  ghost: [
    'bg-transparent text-foreground-muted font-medium',
    'hover:text-foreground hover:bg-accent-subtle',
    'transition-all duration-base',
  ].join(' '),
  outline: [
    'bg-transparent text-accent font-medium',
    'border border-accent',
    'hover:bg-accent-subtle active:bg-accent-subtle-strong',
    'transition-all duration-base',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-md',
  md: 'px-6 py-3 text-base rounded-lg',
  lg: 'px-8 py-4 text-lg rounded-xl',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  as = 'button',
  href,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = [
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'w-full' : '',
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    className,
  ].join(' ')

  const tapProps = !disabled ? { whileTap: { scale: 0.98 } } : {}

  if (as === 'a' && href) {
    const restProps = props as HTMLMotionProps<'a'>
    return (
      <motion.a
        href={href}
        className={baseClasses}
        {...tapProps}
        {...restProps}
      >
        {children}
      </motion.a>
    )
  }

  const restProps = props as HTMLMotionProps<'button'>
  return (
    <motion.button
      className={baseClasses}
      disabled={disabled}
      {...tapProps}
      {...restProps}
    >
      {children}
    </motion.button>
  )
}
