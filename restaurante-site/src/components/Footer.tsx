'use client'

import { Container } from '@/components/ui'
import Image from 'next/image'
import {
  FaEnvelope,
  FaWhatsapp,
  FaInstagram,
  FaLinkedin,
  FaArrowUpRightFromSquare,
} from 'react-icons/fa6'
import { useLatestBuildDownloads } from '@/utils/useLatestBuildDownloads'

const EXTERNAL_LINKS = {
  webLogin: 'https://restaurante-web.app.br/login',
} as const

const footerLinks = [
  { label: 'Produto', href: '#produto' },
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Plano', href: '#plano' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Segurança', href: '#seguranca' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contato', href: '#contato' },
]

export function Footer() {
  const { androidHref, iosHref, hasIOSIpa } = useLatestBuildDownloads()

  return (
    <footer className="bg-surface border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent flex items-center justify-center">
                <Image
                  src="/favicon.png"
                  alt="Logo Machado e Cunha"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-cover"
                />
              </div>
              <span className="font-display text-foreground text-base font-semibold">
                Machado &amp; Cunha
              </span>
            </div>
            <p className="text-foreground-muted text-sm leading-relaxed mb-4">
              Do balcão à cozinha, tudo sob controle.
            </p>
            {/* Social */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg bg-surface-light border border-border flex items-center justify-center text-foreground-muted hover:text-accent hover:border-strong transition-colors duration-base"
              >
                <FaInstagram size={16} />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-lg bg-surface-light border border-border flex items-center justify-center text-foreground-muted hover:text-accent hover:border-strong transition-colors duration-base"
              >
                <FaLinkedin size={16} />
              </a>
              <a
                href="mailto:contato@restaurante-web.app.br"
                aria-label="E-mail"
                className="w-9 h-9 rounded-lg bg-surface-light border border-border flex items-center justify-center text-foreground-muted hover:text-accent hover:border-strong transition-colors duration-base"
              >
                <FaEnvelope size={16} />
              </a>
              <a
                href="#"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-lg bg-surface-light border border-border flex items-center justify-center text-foreground-muted hover:text-accent hover:border-strong transition-colors duration-base"
              >
                <FaWhatsapp size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Navegação
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-foreground-muted hover:text-accent transition-colors duration-base"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            {/* Access links */}
            <div className="mt-6 pt-4 border-t border-border-subtle space-y-2">
              <a
                href={EXTERNAL_LINKS.webLogin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <FaArrowUpRightFromSquare size={12} />
                Acessar o sistema
              </a>
              <a
                href={androidHref}
                download="android-latest.apk"
                className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                Baixar app Android
              </a>
              <a
                href={iosHref}
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  'flex items-center gap-2 text-sm transition-colors',
                  hasIOSIpa
                    ? 'text-accent hover:text-accent-hover'
                    : 'text-foreground-muted pointer-events-none opacity-50',
                ].join(' ')}
                aria-disabled={!hasIOSIpa}
              >
                {hasIOSIpa ? 'Baixar app iOS' : 'App iOS em breve'}
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/privacy"
                  className="text-sm text-foreground-muted hover:text-accent transition-colors duration-base"
                >
                  Política de privacidade
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-sm text-foreground-muted hover:text-accent transition-colors duration-base"
                >
                  Termos de uso
                </a>
              </li>
            </ul>
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <p className="text-xs text-foreground-muted leading-relaxed">
                Machado &amp; Cunha Soft House
                <br />
                Nome Empresarial: E F CUNHA LTDA
                <br />
                CNPJ: 48.038.321/0001-01
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-border-subtle text-center">
          <p className="text-xs text-foreground-muted">
            &copy; 2025 Machado &amp; Cunha Soft House. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
