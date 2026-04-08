'use client'

import { motion } from 'framer-motion'
import { Section, Badge, Card } from '@/components/ui'
import {
  FaShieldHalved,
  FaLock,
  FaEyeSlash,
  FaFileContract,
  FaDatabase,
  FaUserShield,
} from 'react-icons/fa6'

const securityItems = [
  {
    icon: <FaDatabase size={24} />,
    title: 'RLS — Row-Level Security',
    description:
      'Cada empresa tem seus dados isolados no banco. Sem acesso cruzado, sem exceções.',
  },
  {
    icon: <FaLock size={24} />,
    title: 'Menor privilégio',
    description:
      'Roles canônicas (admin, gerente, garçom, cozinha) com permissões mínimas necessárias.',
  },
  {
    icon: <FaEyeSlash size={24} />,
    title: 'LGPD — Dados protegidos',
    description:
      'PII nunca logado em texto claro. Política de retenção e exclusão de dados pessoais.',
  },
  {
    icon: <FaShieldHalved size={24} />,
    title: 'Proteção OWASP',
    description:
      'Sem segredos hardcoded, sem CORS wildcard, sem bypass de RLS. Defesa em profundidade.',
  },
  {
    icon: <FaUserShield size={24} />,
    title: 'Autenticação segura',
    description:
      'Tokens JWT em Secure Store (mobile), service_role apenas no servidor.',
  },
  {
    icon: <FaFileContract size={24} />,
    title: 'Auditoria completa',
    description:
      'Cada operação financeira é rastreável, idempotente e auditável.',
  },
]

export function Security() {
  return (
    <Section id="seguranca" className="bg-surface/50">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="accent">Segurança e conformidade</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Seus dados blindados. Sua operação protegida.
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Levamos segurança a sério em cada camada — do banco de dados ao
            deploy, do login à reconciliação financeira.
          </p>
        </div>

        {/* Security Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {securityItems.map((item) => (
            <Card
              key={item.title}
              variant="default"
              padding="lg"
              className="hover:border-strong transition-colors duration-base group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent mb-4 group-hover:bg-accent-subtle-strong group-hover:shadow-glow transition-all duration-base">
                {item.icon}
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-1.5">
                {item.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {item.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Trust message */}
        <div className="mt-12 text-center">
          <p className="text-foreground-secondary text-base max-w-xl mx-auto leading-relaxed">
            Dados isolados por empresa, sem acesso cruzado, logs sem informações
            pessoais expostas. Confiança se constrói com transparência.
          </p>
        </div>
      </motion.div>
    </Section>
  )
}
