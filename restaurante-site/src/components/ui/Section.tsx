'use client'

import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'

interface SectionProps extends HTMLMotionProps<'section'> {
  children: React.ReactNode
  className?: string
  id?: string
  containerWidth?: 'sm' | 'md' | 'lg' | 'xl' | '7xl' | 'full'
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.1 },
  },
}

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-7xl',
  xl: 'max-w-xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

export function Section({
  children,
  className = '',
  id,
  containerWidth = 'lg',
  ...props
}: SectionProps) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px', amount: 0.2 }}
      variants={containerVariants}
      className={`w-full px-4 sm:px-6 md:px-8 py-12 md:py-16 ${className}`}
      {...props}
    >
      <div className={`mx-auto ${widthMap[containerWidth]}`}>
        {children}
      </div>
    </motion.section>
  )
}
