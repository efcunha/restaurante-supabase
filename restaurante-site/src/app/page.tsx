import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { AboutProduct } from '@/components/AboutProduct'
import { Features } from '@/components/Features'
import { Pricing } from '@/components/Pricing'
import { HowItWorks } from '@/components/HowItWorks'
import { Testimonials } from '@/components/Testimonials'
import { Security } from '@/components/Security'
import { FAQ } from '@/components/FAQ'
import { Contact } from '@/components/Contact'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <AboutProduct />
        <Features />
        <Pricing />
        <HowItWorks />
        <Testimonials />
        <Security />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
