'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { FaBars, FaXmark } from 'react-icons/fa6'
import Image from 'next/image'

const navLinks = [
  { label: 'Produto', href: '#produto' },
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Plano', href: '#plano' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Segurança', href: '#seguranca' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contato', href: '#contato' },
]

const EXTERNAL_LINKS = {
  webLogin: 'https://restaurante-web.app.br/login',
} as const

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={[
        'fixed top-0 left-0 right-0 z-sticky',
        'transition-all duration-slow',
        scrolled ? 'bg-background/90 backdrop-blur-lg shadow-lg' : 'bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent flex items-center justify-center">
            <Image
              src="/favicon.png"
              alt="Logo Machado e Cunha"
              width={32}
              height={32}
              className="w-8 h-8 object-cover"
              priority
            />
          </div>
          <span className="font-display text-foreground text-lg font-semibold tracking-tight hidden sm:inline">
            Machado &amp; Cunha
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-2 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors duration-base rounded-md hover:bg-accent-subtle whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="ghost" size="sm" as="a" href={EXTERNAL_LINKS.webLogin} target="_blank" rel="noopener noreferrer">
            Acessar o sistema
          </Button>
          <Button variant="outline" size="sm" as="a" href="#contato">
            Solicitar demonstração
          </Button>
        </nav>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-accent-subtle transition-colors"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileOpen ? <FaXmark size={20} className="text-foreground" /> : <FaBars size={20} className="text-foreground" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 top-16 bg-background/95 backdrop-blur-lg z-overlay px-6 py-8"
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-lg text-foreground hover:text-accent hover:bg-accent-subtle rounded-lg transition-colors duration-base"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  as="a"
                  href={EXTERNAL_LINKS.webLogin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                >
                  Acessar o sistema
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  as="a"
                  href="#contato"
                  onClick={() => setMobileOpen(false)}
                >
                  Solicitar demonstração
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
