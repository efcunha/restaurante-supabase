import { type HTMLAttributes } from 'react'

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeMap: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Container({ children, size = 'xl', className = '', ...props }: ContainerProps) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 md:px-8 ${sizeMap[size]} ${className}`} {...props}>
      {children}
    </div>
  )
}
