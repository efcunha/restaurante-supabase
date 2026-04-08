'use client'

import { motion } from 'framer-motion'
import { Section, Button, Container } from '@/components/ui'
import { FaMobileScreenButton, FaGlobe, FaAndroid, FaApple } from 'react-icons/fa6'
import { useLatestBuildDownloads } from '@/utils/useLatestBuildDownloads'

const EXTERNAL_LINKS = {
  webLogin: 'https://restaurante-web.app.br/login',
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
}

export function Hero() {
  const { androidHref, iosHref, hasIOSManifest } = useLatestBuildDownloads()

  return (
    <Section
      id="hero"
      className="pt-32 md:pt-40 pb-16 md:pb-24 min-h-screen flex items-center"
      containerWidth="full"
    >
      <Container className="text-center">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={itemVariants}
          className="mb-6 md:mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-subtle-strong border border-strong text-accent text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Plataforma completa para restaurantes
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          custom={1}
          variants={itemVariants}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight mb-4 md:mb-6"
        >
          Do balcão à cozinha,
          <br />
          <span className="text-accent">tudo sob controle.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          custom={2}
          variants={itemVariants}
          className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed"
        >
          Sistema PDV/POS integrado com app mobile, interface web e backend SaaS.
          Operação unificada para balcão, mesa, delivery e cozinha — com auditoria
          financeira completa e conformidade LGPD.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 md:mb-20"
        >
          <Button variant="primary" size="lg" as="a" href="#contato">
            Solicitar demonstração
          </Button>
          <Button variant="outline" size="lg" as="a" href="#plano">
            Conhecer o plano
          </Button>
        </motion.div>

        {/* Product Ecosystem Cards */}
        <motion.div
          custom={4}
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto"
        >
          {[
            {
              icon: <FaMobileScreenButton size={24} />,
              title: 'App Mobile',
              description: 'React Native — balcão, mesa, delivery, comandas',
              actions: (
                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={androidHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    <FaAndroid size={12} />
                    Android
                  </a>
                  <span className="text-foreground-disabled text-xs">|</span>
                  <a
                    href={iosHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={[
                      'inline-flex items-center gap-1.5 text-xs transition-colors',
                      hasIOSManifest
                        ? 'text-accent hover:text-accent-hover'
                        : 'text-foreground-muted pointer-events-none opacity-50',
                    ].join(' ')}
                    aria-disabled={!hasIOSManifest}
                  >
                    <FaApple size={12} />
                    {hasIOSManifest ? 'iOS' : 'iOS em breve'}
                  </a>
                </div>
              ),
            },
            {
              icon: <FaGlobe size={24} />,
              title: 'Interface Web',
              description: 'Expo Web — gestão e espelho das operações',
              actions: (
                <a
                  href={EXTERNAL_LINKS.webLogin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors mt-3"
                >
                  Acessar o sistema →
                </a>
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-surface border border-border rounded-xl p-6 text-left hover:border-strong transition-colors duration-base group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-subtle-strong flex items-center justify-center text-accent mb-3 group-hover:shadow-glow transition-shadow duration-base">
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-foreground-muted">{item.description}</p>
              {item.actions}
            </div>
          ))}
        </motion.div>
      </Container>
    </Section>
  )
}
