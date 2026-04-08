import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import '@/styles/globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'Machado & Cunha Soft House — Do balcão à cozinha, tudo sob controle.',
  description: 'Plataforma full-stack de operação de restaurante — PDV/POS integrado com app mobile, web e backend SaaS. Multiempresa, seguro e em conformidade com LGPD.',
  keywords: ['restaurante', 'PDV', 'POS', 'gestão', 'delivery', 'comandas', 'mesas', 'software'],
  authors: [{ name: 'Machado & Cunha Soft House' }],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Machado & Cunha Soft House',
    description: 'Do balcão à cozinha, tudo sob controle.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
