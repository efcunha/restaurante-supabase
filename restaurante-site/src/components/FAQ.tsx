'use client'

import { motion } from 'framer-motion'
import { Section, Accordion, Badge } from '@/components/ui'

const faqItems = [
  {
    question: 'O plano cobre mais de um restaurante?',
    answer: (
      <p>
        O plano de R$ 149/mês cobre <strong>1 restaurante</strong>. Se você opera
        múltiplas unidades, cada uma terá seu próprio cadastro e plano. Entre em
        contato para condições especiais de multi-unidades.
      </p>
    ),
  },
  {
    question: 'Preciso de internet para usar o sistema?',
    answer: (
      <p>
        Sim. O sistema opera em cloud e requer conexão com internet para sincronização
        de dados em tempo real. O app mobile possui cache local para consultas
        recentes, mas operações de escrita exigem conectividade.
      </p>
    ),
  },
  {
    question: 'Como é feita a cobrança mensal?',
    answer: (
      <p>
        A cobrança é via Mercado Pago, de forma recorrente. Você pode pagar com
        cartão de crédito, boleto ou Pix. O cancelamento pode ser feito a qualquer
        momento, sem multa ou fidelidade.
      </p>
    ),
  },
  {
    question: 'Meus dados ficam seguros?',
    answer: (
      <p>
        Absolutamente. Utilizamos <strong>Row-Level Security (RLS)</strong> no PostgreSQL
        para isolamento total por empresa, autenticação via Supabase Auth com tokens
        JWT em Secure Store, e seguimos as diretrizes da <strong>LGPD</strong> para
        proteção de dados pessoais. Nenhuma informação pessoal é exposta em logs.
      </p>
    ),
  },
  {
    question: 'Tem integração com iFood ou outros marketplaces?',
    answer: (
      <p>
        No momento, o módulo de delivery opera de forma independente. A integração com
        iFood e outros marketplaces está no roadmap de desenvolvimento. Entre em contato
        para saber mais sobre o cronograma.
      </p>
    ),
  },
  {
    question: 'Como funciona o suporte?',
    answer: (
      <p>
        Oferecemos suporte via <strong>e-mail e chat</strong> durante o horário comercial.
        Na fase de implantação, há acompanhamento dedicado da nossa equipe para configuração
        e treinamento. Para questões críticas em produção, oferecemos canal prioritário.
      </p>
    ),
  },
]

export function FAQ() {
  return (
    <Section id="faq" className="bg-surface/50">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="accent">Perguntas frequentes</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Tire suas dúvidas
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            As respostas para as perguntas mais comuns sobre a plataforma.
          </p>
        </div>

        {/* Accordion */}
        <Accordion items={faqItems} className="max-w-3xl mx-auto" />
      </motion.div>
    </Section>
  )
}
