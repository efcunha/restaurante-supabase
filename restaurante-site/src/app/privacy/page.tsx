import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Container } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Machado & Cunha Soft House',
  description: 'Política de privacidade em conformidade com a LGPD.',
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-28 pb-16">
        <Container size="2xl">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-8">
            Política de Privacidade
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground-muted leading-relaxed">
            <p className="text-sm">
              <strong className="text-foreground">Última atualização:</strong> Abril de 2026
            </p>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                1. Introdução
              </h2>
              <p>
                A <strong className="text-foreground">Machado &amp; Cunha Soft House</strong>
                (&quot;Empresa&quot;) está comprometida com a proteção de dados pessoais de
                seus usuários, clientes e visitantes, em conformidade com a{' '}
                <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD)</strong>{' '}
                — Lei nº 13.709/2018.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                2. Dados Coletados
              </h2>
              <p>Coletamos os seguintes tipos de dados:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong className="text-foreground">Dados de cadastro:</strong> nome, e-mail,
                  telefone, nome do estabelecimento
                </li>
                <li>
                  <strong className="text-foreground">Dados de uso:</strong> informações de
                  navegação, interações com a plataforma
                </li>
                <li>
                  <strong className="text-foreground">Dados de pagamento:</strong> processados
                  exclusivamente via Mercado Pago, sem armazenamento de dados financeiros
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                3. Finalidade do Tratamento
              </h2>
              <p>Os dados são utilizados para:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Prestação dos serviços contratados</li>
                <li>Comunicação com o usuário (suporte, atualizações)</li>
                <li>Cobrança e gestão de assinatura</li>
                <li>Melhoria contínua da plataforma</li>
                <li>Cumprimento de obrigações legais</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                4. Isolamento de Dados
              </h2>
              <p>
                Nossa plataforma utiliza <strong className="text-foreground">Row-Level Security (RLS)</strong>{' '}
                no PostgreSQL para garantir que os dados de cada empresa cliente sejam
                completamente isolados. Não há acesso cruzado entre empresas, e todos
                os logs operacionais são protegidos contra exposição de informações pessoais.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                5. Compartilhamento de Dados
              </h2>
              <p>
                Não vendemos, compartilhos ou comercializamos dados pessoais. O
                compartilhamento só ocorre quando necessário para:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Processamento de pagamentos (Mercado Pago)</li>
                <li>Cumprimento de obrigação legal ou regulatória</li>
                <li>Ordem judicial ou de autoridade competente</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                6. Segurança
              </h2>
              <p>
                Adotamos medidas técnicas e organizacionais para proteger os dados pessoais,
                incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Autenticação segura com tokens JWT em Secure Store</li>
                <li>Nunca hardcodar segredos ou chaves de serviço</li>
                <li>PII nunca logado em texto claro</li>
                <li>Política de retenção e exclusão de dados pessoais</li>
                <li>Monitoramento e auditoria de acessos</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                7. Direitos do Titular
              </h2>
              <p>
                Em conformidade com a LGPD, o titular dos dados pessoais tem direito a:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos dados</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Eliminação dos dados tratados com consentimento</li>
                <li>Revogação do consentimento</li>
              </ul>
              <p className="mt-2">
                Para exercer seus direitos, entre em contato:{' '}
                <a href="mailto:contato@restaurante-web.app.br" className="text-accent hover:underline">
                  contato@restaurante-web.app.br
                </a>
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                8. Retenção de Dados
              </h2>
              <p>
                Os dados pessoais são mantidos pelo prazo necessário para cumprir as
                finalidades descritas nesta política, ou conforme exigido por lei.
                Após o encerramento da conta, os dados são eliminados ou anonimizados
                em até 90 dias, salvo obrigação legal de retenção.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-3">
                9. Contato
              </h2>
              <p>
                Para dúvidas ou solicitações relacionadas a dados pessoais:{' '}
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
