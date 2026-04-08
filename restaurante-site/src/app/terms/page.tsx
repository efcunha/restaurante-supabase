import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Container } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Termos de Uso — Machado & Cunha Soft House',
  description: 'Termos de uso da plataforma Machado & Cunha Soft House.',
}

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-28 pb-16">
        <Container size="2xl">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-8">
            Termos de Uso
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground-muted leading-relaxed">
            <p className="text-sm">
              <strong className="text-foreground">Última atualização:</strong> Abril de 2026
            </p>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar e utilizar a plataforma{' '}
                <strong className="text-foreground">Machado &amp; Cunha Soft House</strong>,
                o usuário concorda integralmente com estes Termos de Uso. Se não concordar,
                não utilize a plataforma.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                2. Descrição do Serviço
              </h2>
              <p>
                A plataforma é um sistema de gestão para restaurantes que inclui:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>App mobile (iOS e Android) para operação de PDV/POS</li>
                <li>Interface web de gestão e acompanhamento operacional</li>
                <li>Backend SaaS com autenticação, billing e métricas</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                3. Plano e Cobrança
              </h2>
              <p>
                O plano único tem o valor de <strong className="text-foreground">R$ 149/mês</strong>{' '}
                por restaurante cadastrado. A cobrança é recorrente via Mercado Pago, com
                opções de cartão de crédito, boleto ou Pix.
              </p>
              <p>
                <strong className="text-foreground">Período de teste:</strong> 30 dias grátis
                para avaliação. <strong className="text-foreground">Sem fidelidade:</strong>{' '}
                o cancelamento pode ser feito a qualquer momento, sem multa.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                4. Uso Aceitável
              </h2>
              <p>O usuário se compromete a:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Utilizar a plataforma apenas para fins legítimos</li>
                <li>Não tentar burlar mecanismos de segurança ou controle de acesso</li>
                <li>Não compartilhar credenciais de acesso com terceiros</li>
                <li>Manter informações de cadastro atualizadas</li>
                <li>Respeitar as leis aplicáveis, incluindo a LGPD</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                5. Propriedade Intelectual
              </h2>
              <p>
                Todo o conteúdo, código, design, marcas e materiais da plataforma são
                de propriedade exclusiva da Machado &amp; Cunha Soft House. É proibida
                a reprodução, distribuição ou modificação sem autorização prévia.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                6. Disponibilidade e SLA
              </h2>
              <p>
                Nos esforçamos para manter a plataforma disponível 24/7, mas não
                garantimos ausência de interrupções. Manutenções programadas serão
                comunicadas com antecedência quando possível.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                7. Limitação de Responsabilidade
              </h2>
              <p>
                A Empresa não se responsabiliza por danos indiretos, incidentais ou
                consequenciais decorrentes do uso ou da impossibilidade de uso da
                plataforma. A responsabilidade total é limitada ao valor pago pelo
                usuário nos 12 meses anteriores ao evento.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                8. Rescisão
              </h2>
              <p>
                A Empresa pode suspender ou encerrar o acesso do usuário que violar
                estes Termos, sem prejuízo das medidas legais cabíveis. O usuário pode
                cancelar sua assinatura a qualquer momento.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                9. Alterações nos Termos
              </h2>
              <p>
                Estes Termos podem ser atualizados periodicamente. Alterações significativas
                serão comunicadas aos usuários com antecedência razoável.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                10. Contato
              </h2>
              <p>
                Para dúvidas sobre estes Termos:{' '}
                <a href="mailto:contato@restaurante-web.app.br" className="text-accent hover:underline">
                  contato@restaurante-web.app.br
                </a>
              </p>
            </section>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  )
}
