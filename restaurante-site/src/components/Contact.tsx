'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Section, Button, Badge, Card } from '@/components/ui'
import { FaEnvelope, FaWhatsapp, FaClock, FaPaperPlane } from 'react-icons/fa6'

const EDGE_FUNCTION_URL =
  typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/functions/v1/send-contact`
    : ''

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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (!EDGE_FUNCTION_URL) {
        throw new Error('URL do serviço de contato não configurada.')
      }

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao enviar mensagem.')
      }

      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setForm(initialForm)
      }, 5000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
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
                    contato@restaurante-web.app.br
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
                    (83) 99917-2452
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
            <Card variant="elevated" padding="md" className="sm:p-6 lg:p-8">
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

                  {/* Error message */}
                  {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <Button variant="primary" size="lg" fullWidth type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane size={16} />
                        Enviar mensagem
                      </>
                    )}
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
