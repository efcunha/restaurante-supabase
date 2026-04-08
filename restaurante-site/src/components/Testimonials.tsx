'use client'

import { motion } from 'framer-motion'
import { Section, Badge, Card } from '@/components/ui'
import {
  FaUtensils,
  FaBurger,
  FaMugHot,
  FaWineGlass,
} from 'react-icons/fa6'

const establishmentTypes = [
  {
    icon: <FaUtensils size={28} />,
    title: 'Restaurante à la carte',
    description: 'Gestão de mesas, comandas e pedidos com acompanhamento de status.',
  },
  {
    icon: <FaBurger size={28} />,
    title: 'Lanchonete e fast food',
    description: 'Fluxo de balcão ágil com montagem rápida e controle de adicionais.',
  },
  {
    icon: <FaWineGlass size={28} />,
    title: 'Bar e pub',
    description: 'Consumo aberto por comanda, fechamento rápido e controle de mesa.',
  },
  {
    icon: <FaMugHot size={28} />,
    title: 'Cafeteria e delivery',
    description: 'Entregas com numeração automática e reconciliação financeira.',
  },
]

export function Testimonials() {
  return (
    <Section id="depoimentos">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="accent">Para quem é</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Feito para food service
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Não importa o formato — se você serve comida, nosso sistema foi
            feito para o seu dia a dia.
          </p>
        </div>

        {/* Establishment Types */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {establishmentTypes.map((item) => (
            <Card
              key={item.title}
              variant="elevated"
              padding="lg"
              className="text-center hover:border-strong transition-colors duration-base group"
            >
              <div className="w-14 h-14 rounded-xl bg-accent-subtle-strong flex items-center justify-center text-accent mx-auto mb-4 group-hover:shadow-glow transition-shadow duration-base">
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {item.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Depoimentos placeholder */}
        <div className="mt-16 text-center">
          <p className="text-foreground-muted text-sm italic">
            Depoimentos de clientes em breve.
          </p>
        </div>
      </motion.div>
    </Section>
  )
}
