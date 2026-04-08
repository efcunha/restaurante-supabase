'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Section, Button, Badge, Card } from '@/components/ui'
import { FaEnvelope, FaWhatsapp, FaClock, FaPaperPlane } from 'react-icons/fa6'

interface FormData {
  name: string
  email: string
  phone: string
  establishment: string
  message: string
}

const initialForm: FormData = {
  name: '',
  email: '',
  phone: '',
  establishment: '',
  message: '',
}

export function Contact() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // TODO: integrate with actual form submission endpoint
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setForm(initialForm)
    }, 4000)
  }

  return (
    <Section id="contato">
      <motion.div variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="accent">Contato e suporte</Badge>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-4 mb-4">
            Fale com a gente
          </h2>
          <p className="text-foreground-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Solicite uma demonstração, tire dúvidas ou fale com nosso time
            de suporte.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card variant="default" padding="md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle-strong flex items-center justify-center text-accent">
                  <FaEnvelope size={18} />
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">E-mail</p>
                  <p className="text-foreground font-medium text-sm">
                    contato@machadoecunha.com.br
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle-strong flex items-center justify-center text-accent">
                  <FaWhatsapp size={18} />
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">WhatsApp</p>
                  <p className="text-foreground font-medium text-sm">
                    (00) 00000-0000
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle-strong flex items-center justify-center text-accent">
                  <FaClock size={18} />
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Atendimento</p>
                  <p className="text-foreground font-medium text-sm">
                    Seg–Sex, 9h às 18h
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card variant="elevated" padding="lg">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    Mensagem enviada!
                  </h3>
                  <p className="text-foreground-muted">
                    Entraremos em contato em breve.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm text-foreground-secondary mb-1.5">
                        Nome *
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Seu nome"
                        className="w-full px-4 py-3 bg-surface-light border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-base"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm text-foreground-secondary mb-1.5">
                        E-mail *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className="w-full px-4 py-3 bg-surface-light border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="phone" className="block text-sm text-foreground-secondary mb-1.5">
                        Telefone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 bg-surface-light border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-base"
                      />
                    </div>
                    <div>
                      <label htmlFor="establishment" className="block text-sm text-foreground-secondary mb-1.5">
                        Estabelecimento *
                      </label>
                      <input
                        id="establishment"
                        name="establishment"
                        type="text"
                        required
                        value={form.establishment}
                        onChange={handleChange}
                        placeholder="Nome do restaurante"
                        className="w-full px-4 py-3 bg-surface-light border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm text-foreground-secondary mb-1.5">
                      Mensagem *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Como podemos ajudar?"
                      className="w-full px-4 py-3 bg-surface-light border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-base resize-none"
                    />
                  </div>

                  <Button variant="primary" size="lg" fullWidth type="submit">
                    <FaPaperPlane size={16} />
                    Enviar mensagem
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    </Section>
  )
}
