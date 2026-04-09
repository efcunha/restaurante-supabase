# restaurante-site

Site institucional da **Machado & Cunha Soft House** — software house brasileira especializada em sistemas de gestão para restaurantes.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) + Static Export
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 3.4 (design tokens Figma-style)
- **Animations:** Framer Motion
- **Icons:** React Icons (FontAwesome 6)
- **Fonts:** Playfair Display (headings) + DM Sans (body) via Google Fonts

---

## Design System

O site segue padrão **Figma-style development**:

| Token | Value |
|---|---|
| Background | `#0f0f0f` |
| Surface | `#111827` |
| Accent (gold) | `#d4a853` |
| Foreground | `#f5f5f5` |
| Font Display | Playfair Display |
| Font Body | DM Sans |

Tokens completos em `src/styles/tokens.css` — cores, tipografia, spacing, radius, shadows, transitions, z-index e containers.

---

## Getting Started

### Install

```bash
cd restaurante-site
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Output estático em `out/`.

### Preview

```bash
npm run start
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Homepage
│   ├── privacy/page.tsx        # Privacy policy (LGPD)
│   └── terms/page.tsx          # Terms of use
├── components/
│   ├── ui/                     # Design system primitives
│   │   ├── Section.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Accordion.tsx
│   │   ├── Container.tsx
│   │   ├── Badge.tsx
│   │   └── index.ts
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── AboutProduct.tsx
│   ├── Features.tsx
│   ├── Pricing.tsx
│   ├── HowItWorks.tsx
│   ├── Testimonials.tsx
│   ├── Security.tsx
│   ├── FAQ.tsx
│   ├── Contact.tsx
│   └── Footer.tsx
├── styles/
│   ├── tokens.css              # Design tokens (Figma-style)
│   └── globals.css             # Global styles
└── utils/
    └── animations.ts           # Framer Motion variants
```

---

## Sections

| Section | ID | Description |
|---|---|---|
| Hero | `#hero` | Tagline, CTAs, product ecosystem cards |
| Produto | `#produto` | Ecossistema integrado + diferenciais |
| Funcionalidades | `#funcionalidades` | Feature grid com 9 items |
| Plano | `#plano` | Plano único — R$ 149/mês |
| Como funciona | `#como-funciona` | 4-step onboarding timeline |
| Depoimentos | `#depoimentos` | Tipos de estabelecimento (placeholder) |
| Segurança | `#seguranca` | LGPD, RLS, OWASP compliance |
| FAQ | `#faq` | 6 perguntas frequentes (accordion) |
| Contato | `#contato` | Form + canais de suporte |

---

## Deploy

### Static Export

Configurado com `output: 'export'` em `next.config.js`. Build gera `out/` estático.

### Railway

```bash
railway up --service restaurante-site
```

`railway.json` configurado com `npx serve out -s`.

## Downloads Locais (Android)

Armazenamento no monorepo:
- Build local do app: `restaurante-app/build/`
- Publicação para o site: `restaurante-site/public/downloads/`

Scripts:
- `cd restaurante-site && npm run sync:android-local`

Observação importante:
- O script acima executa `restaurante-app/scripts/build-android.sh` para gerar o APK localmente.
- Em seguida, publica o arquivo como `restaurante-site/public/downloads/android-latest.apk`.

Fluxo recomendado:
1. Gerar APK local do Android com `npm run sync:android-local` em `restaurante-site`.
2. Validar que existe `restaurante-site/public/downloads/android-latest.apk`.
3. Executar build/deploy do `restaurante-site`.

---

## External Links

| Link | URL |
|---|---|
| Web POS Login | `https://restaurante-web.app.br/login` |
| Android App (EAS) | `https://expo.dev/accounts/lumachadolp/projects/restaurante-app/builds/cb8cfb99-dc57-47ce-8a78-c7846aef9ebc` |
| iOS App | _TODO: add when available_ |

These links appear in:
- **Header** — "Acessar o sistema" button + mobile menu
- **Hero** — ecosystem cards with download/login CTAs
- **Footer** — "Acessar o sistema" + "Baixar app Android"

---

## What NOT to do

- Visual genérico de "SaaS startup" com gradientes roxos
- Jargões técnicos excessivos na copy
- Seções vazias sem placeholder elegante
- Imagens de banco de imagens óbvias
