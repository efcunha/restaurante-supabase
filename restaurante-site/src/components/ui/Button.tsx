'use client'

import { type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  as?: 'button'
  href?: never
  target?: never
  rel?: never
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  as: 'a'
  href: string
  target?: string
  rel?: string
  type?: never
  disabled?: boolean
}

type ButtonAllProps = ButtonProps | ButtonLinkProps

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
  target,
  rel,
  type,
  className = '',
  disabled,
  ...props
}: ButtonAllProps) {
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

  if (as === 'a' && href) {
    const restProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={baseClasses}
        {...restProps}
      >
        {children}
      </a>
    )
  }

  const restProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button
      type={type}
      className={baseClasses}
      disabled={disabled}
      {...restProps}
    >
      {children}
    </button>
  )
}
