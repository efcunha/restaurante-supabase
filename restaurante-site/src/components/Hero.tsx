'use client';

import { Button, Container, Section } from '@/components/ui';
import { useLatestBuildDownloads } from '@/utils/useLatestBuildDownloads';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';
import { FaAndroid, FaApple, FaGlobe, FaMobileScreenButton } from 'react-icons/fa6';

const EXTERNAL_LINKS = {
  webLogin: 'https://restaurante-web.app.br/login',
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

export function Hero() {
  const { androidHref, iosHref, hasAndroidManifest, hasIOSIpa } = useLatestBuildDownloads();
  const androidQrValue = useMemo(() => {
    if (typeof window === 'undefined') {
      return androidHref;
    }

    try {
      return new URL(androidHref, window.location.origin).toString();
    } catch {
      return androidHref;
    }
  }, [androidHref]);

  return (
    <Section
      id="hero"
      className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-24 min-h-[80vh] md:min-h-screen flex items-center"
      containerWidth="full"
    >
      <Container className="text-center">
        {/* Badge */}
        <motion.div custom={0} variants={itemVariants} className="mb-6 md:mb-8">
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
          Sistema PDV/POS integrado com app mobile, interface web e backend SaaS. Operação unificada
          para balcão, mesa, delivery e cozinha — com auditoria financeira completa e conformidade
          LGPD.
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
          {/* App Mobile Card */}
          <div className="bg-surface border border-border rounded-xl p-6 text-left hover:border-strong transition-colors duration-base group flex flex-col">
            <div className="w-10 h-10 rounded-lg bg-accent-subtle-strong flex items-center justify-center text-accent mb-3 group-hover:shadow-glow transition-shadow duration-base">
              <FaMobileScreenButton size={24} />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">App Mobile</h3>
            <p className="text-sm text-foreground-muted mb-3">
              React Native — balcão, mesa, delivery, comandas
            </p>

            {/* Download Links */}
            <div className="flex items-center gap-2 mt-auto">
              <a
                href={androidHref}
                download="android-latest.apk"
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
                  hasIOSIpa
                    ? 'text-accent hover:text-accent-hover'
                    : 'text-foreground-muted pointer-events-none opacity-50',
                ].join(' ')}
                aria-disabled={!hasIOSIpa}
              >
                <FaApple size={12} />
                {hasIOSIpa ? 'iOS' : 'iOS em breve'}
              </a>
            </div>
          </div>

          {/* Interface Web Card */}
          <div className="bg-surface border border-border rounded-xl p-6 text-left hover:border-strong transition-colors duration-base group flex flex-col">
            <div className="w-10 h-10 rounded-lg bg-accent-subtle-strong flex items-center justify-center text-accent mb-3 group-hover:shadow-glow transition-shadow duration-base">
              <FaGlobe size={24} />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              Interface Web
            </h3>
            <p className="text-sm text-foreground-muted mb-3">
              Expo Web — gestão e espelho das operações
            </p>

            <a
              href={EXTERNAL_LINKS.webLogin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors mt-auto"
            >
              Acessar o sistema →
            </a>
          </div>
        </motion.div>

        {/* QR Code Section - Android Only */}
        <motion.div custom={5} variants={itemVariants} className="mt-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-3 rounded-xl border border-strong bg-surface p-4 max-w-sm">
            <div className="rounded-lg bg-white p-2 flex-shrink-0">
              <QRCodeSVG value={androidQrValue} size={80} level="M" includeMargin />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <FaAndroid className="text-accent" size={12} />
                <span className="text-xs font-semibold text-foreground">QR Code Android</span>
              </div>
              <p className="text-[11px] leading-snug text-foreground-muted">
                Escaneie com o celular para baixar o APK
              </p>
              {!hasAndroidManifest && (
                <p className="mt-1 text-[10px] text-foreground-disabled">
                  Link padrão até publicar o próximo build.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
