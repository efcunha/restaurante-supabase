'use client'

import { motion } from 'framer-motion'
import { Section, Button, Card, Badge } from '@/components/ui'
import { FaCheck, FaArrowRight } from 'react-icons/fa6'

const included = [
  '1 restaurante cadastrado',
  'App mobile completo (Android, iOS em breve)',
  'Interface web de gestão',
  'Suporte via e-mail e chat',
]

export function Pricing() {
  return (
    <Section id="plano" className="bg-surface/50">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="accent">Plano único</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Simples, honesto e completo
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Sem surpresas, sem planos confusos. Tudo que seu restaurante precisa
            em um único plano.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <Card
            variant="outlined"
            padding="lg"
            className="text-center relative overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-accent-subtle opacity-50 pointer-events-none" />

            <div className="relative">
              {/* Price */}
              <div className="mb-6">
                <span className="text-foreground-muted text-sm sm:text-lg">A partir de</span>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-foreground-muted text-sm sm:text-lg">R$</span>
                  <span className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-accent">
                    149
                  </span>
                  <span className="text-foreground-muted text-sm sm:text-lg">/mês</span>
                </div>
              </div>

              {/* Included items */}
              <ul className="space-y-3 mb-8 text-left">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-accent-subtle-strong flex items-center justify-center">
                      <FaCheck size={10} className="text-accent" />
                    </span>
                    <span className="text-foreground text-base">{item}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button variant="primary" size="lg" fullWidth as="a" href="#contato">
                Assinar agora
                <FaArrowRight size={16} />
              </Button>
            </div>
          </Card>

          {/* Trust lines */}
          <div className="text-center mt-6">
            <p className="text-foreground-muted text-sm italic">
              30 dias grátis para testar. Sem fidelidade. Cancele quando quiser.
            </p>
          </div>
          <div className="text-center mt-3">
            <p className="text-foreground-secondary text-sm">
              Tudo que seu restaurante precisa, em um único plano simples e honesto.
            </p>
          </div>
        </div>
      </motion.div>
    </Section>
  )
}
