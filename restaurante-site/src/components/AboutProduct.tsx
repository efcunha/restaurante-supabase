'use client'

import { motion } from 'framer-motion'
import { Section, Card, Badge } from '@/components/ui'
import {
  FaUtensils,
  FaFileInvoiceDollar,
  FaShieldHalved,
} from 'react-icons/fa6'
import { BsBuildings } from 'react-icons/bs'
import { HiOutlineServerStack } from 'react-icons/hi2'

const differentials = [
  {
    icon: <FaUtensils size={28} />,
    title: 'Operação unificada',
    description:
      'Balcao, mesa, delivery e cozinha em uma única plataforma. Sem fragmentação, sem retrabalho.',
  },
  {
    icon: <FaFileInvoiceDollar size={28} />,
    title: 'Controle financeiro',
    description:
      'Auditoria completa de pagamentos, reconciliação automática e rastreabilidade de cada transação.',
  },
  {
    icon: <BsBuildings size={28} />,
    title: 'Multi-restaurante seguro',
    description:
      'Isolamento total por empresa com Row-Level Security. Dados protegidos, sem acesso cruzado.',
  },
  {
    icon: <HiOutlineServerStack size={28} />,
    title: 'Alta disponibilidade',
    description:
      'Arquitetura robusta com PostgreSQL, autenticação segura e deploy automatizado.',
  },
]

export function AboutProduct() {
  return (
    <Section id="produto" className="bg-surface/50">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="accent">Ecossistema integrado</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Uma plataforma. Todo o restaurante.
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Do app mobile ao backoffice SaaS, cada peça foi projetada para funcionar
            em harmonia — com segurança, rastreabilidade e conformidade.
          </p>
        </div>

        {/* Differential Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {differentials.map((item) => (
            <Card
              key={item.title}
              variant="elevated"
              padding="lg"
              className="hover:border-strong transition-colors duration-base group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-subtle-strong flex items-center justify-center text-accent mb-4 group-hover:shadow-glow transition-shadow duration-base">
                {item.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-foreground-muted leading-relaxed">{item.description}</p>
            </Card>
          ))}
        </div>
      </motion.div>
    </Section>
  )
}
