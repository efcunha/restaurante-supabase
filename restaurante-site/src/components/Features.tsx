'use client'

import { motion } from 'framer-motion'
import { Section, Badge } from '@/components/ui'
import {
  FaCashRegister,
  FaReceipt,
  FaBurger,
  FaKitchenSet,
  FaLayerGroup,
  FaCreditCard,
  FaChartLine,
  FaShieldHalved,
  FaFlag,
} from 'react-icons/fa6'

const features = [
  { icon: <FaCashRegister size={22} />, title: 'PDV completo', description: 'Ponto de venda com fluxo de balcão, mesa e delivery' },
  { icon: <FaReceipt size={22} />, title: 'Gestão de mesas e comandas', description: 'Abertura, consumo e fechamento com índice unique' },
  { icon: <FaBurger size={22} />, title: 'Delivery integrado', description: 'Numeração automática e reconciliação de entregas' },
  { icon: <FaKitchenSet size={22} />, title: 'Painel de cozinha', description: 'Montagem de pedidos com useMemo para performance' },
  { icon: <FaLayerGroup size={22} />, title: 'Multi-tenant', description: 'Isolamento por company_id com RLS no PostgreSQL' },
  { icon: <FaCreditCard size={22} />, title: 'Pagamentos', description: 'Reconciliação financeira idempotente via Edge Functions' },
  { icon: <FaChartLine size={22} />, title: 'Relatórios e métricas', description: 'Analytics operacional em tempo real' },
  { icon: <FaShieldHalved size={22} />, title: 'LGPD e segurança', description: 'Dados isolados, PII protegido, auditoria completa' },
  { icon: <FaFlag size={22} />, title: 'Rollout controlado', description: 'Feature flags para lançamento progressivo e seguro' },
]

export function Features() {
  return (
    <Section id="funcionalidades">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="accent">Funcionalidades</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Tudo que seu restaurante precisa
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Do primeiro pedido ao fechamento do caixa, cada etapa foi pensada
            para ser rápida, segura e auditável.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-border bg-surface hover:bg-surface-light hover:border-strong transition-all duration-base"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent mb-4 group-hover:bg-accent-subtle-strong group-hover:shadow-glow transition-all duration-base">
                {feature.icon}
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </Section>
  )
}
