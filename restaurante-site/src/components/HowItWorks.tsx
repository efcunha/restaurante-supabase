'use client'

import { motion } from 'framer-motion'
import { Section, Badge } from '@/components/ui'
import {
  FaUserPlus,
  FaMobileScreen,
  FaGraduationCap,
  FaRocket,
} from 'react-icons/fa6'

const steps = [
  {
    step: 1,
    icon: <FaUserPlus size={24} />,
    title: 'Cadastro e configuração',
    description: 'Registre sua empresa e configure perfis de acesso para sua equipe.',
  },
  {
    step: 2,
    icon: <FaMobileScreen size={24} />,
    title: 'Acesso imediato',
    description: 'Baixe o app mobile e acesse a interface web de gestão.',
  },
  {
    step: 3,
    icon: <FaGraduationCap size={24} />,
    title: 'Treinamento e implantação',
    description: 'Nossa equipe acompanha a configuração e o treinamento completo.',
  },
  {
    step: 4,
    icon: <FaRocket size={24} />,
    title: 'Operação com suporte',
    description: 'Vá para produção com suporte contínuo e monitoramento ativo.',
  },
]

export function HowItWorks() {
  return (
    <Section id="como-funciona">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="accent">Como funciona</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Do zero à operação em 4 passos
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Onboarding simplificado para você começar a usar o sistema
            o mais rápido possível.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-accent-subtle-strong via-accent to-accent-subtle-strong" />

          {steps.map((item, i) => (
            <div key={item.step} className="relative text-center">
              {/* Step number */}
              <div className="relative z-10 mx-auto mb-6">
                <div className="w-14 h-14 rounded-full bg-surface border-2 border-strong flex items-center justify-center text-accent shadow-glow">
                  {item.icon}
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent text-background text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>

              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed max-w-xs mx-auto">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </Section>
  )
}
