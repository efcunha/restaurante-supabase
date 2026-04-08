'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronDown } from 'react-icons/fa6'

interface AccordionItemProps {
  question: string
  answer: ReactNode
  isOpen?: boolean
  onToggle?: () => void
}

function AccordionItem({ question, answer, isOpen = false, onToggle }: AccordionItemProps) {
  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-4 text-left group"
        aria-expanded={isOpen}
      >
        <span className="font-body text-base sm:text-lg text-foreground group-hover:text-accent transition-colors duration-base pr-4">
          {question}
        </span>
        <span
          className={[
            'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full',
            'bg-accent-subtle text-accent',
            'transition-transform duration-base',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        >
          <FaChevronDown size={12} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-5 text-foreground-muted text-base leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AccordionProps {
  items: { question: string; answer: ReactNode }[]
  className?: string
}

export function Accordion({ items, className = '' }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <div className={['border border-border-subtle rounded-xl bg-surface overflow-hidden', className].join(' ')}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
        />
      ))}
    </div>
  )
}
