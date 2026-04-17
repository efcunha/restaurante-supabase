import type { Decorator } from '@storybook/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type ProjectId = 'restaurante-web' | 'restaurante-app' | 'restaurante-site';

interface ProjectTheme {
  pageBackground: string;
  pageOverlay: string;
  cardBackground: string;
  cardBorder: string;
  titleColor: string;
  textColor: string;
  shadow: string;
  maxWidth: number;
}

const PROJECT_THEMES: Record<ProjectId, ProjectTheme> = {
  'restaurante-web': {
    pageBackground: 'radial-gradient(circle at 20% 15%, #dbeafe 0%, #f4f6fb 45%, #e2e8f0 100%)',
    pageOverlay: 'linear-gradient(135deg, rgba(14, 116, 144, 0.08), rgba(11, 103, 128, 0.05))',
    cardBackground: '#ffffff',
    cardBorder: '#d7deea',
    titleColor: '#0b1220',
    textColor: '#5b6472',
    shadow: '0 20px 44px rgba(15, 23, 42, 0.14)',
    maxWidth: 460,
  },
  'restaurante-app': {
    pageBackground: 'radial-gradient(circle at 80% 10%, #cffafe 0%, #e0f2fe 30%, #f8fafc 100%)',
    pageOverlay: 'linear-gradient(145deg, rgba(11, 103, 128, 0.14), rgba(2, 132, 199, 0.08))',
    cardBackground: '#fefefe',
    cardBorder: '#cbd5e1',
    titleColor: '#0f172a',
    textColor: '#475569',
    shadow: '0 26px 58px rgba(2, 6, 23, 0.18)',
    maxWidth: 430,
  },
  'restaurante-site': {
    pageBackground: 'radial-gradient(circle at 20% 10%, #1f2937 0%, #0f0f0f 45%, #020617 100%)',
    pageOverlay: 'linear-gradient(120deg, rgba(212, 168, 83, 0.16), rgba(212, 168, 83, 0.04))',
    cardBackground: '#111827',
    cardBorder: '#2b3444',
    titleColor: '#f5f5f5',
    textColor: '#d1d5db',
    shadow: '0 26px 60px rgba(0, 0, 0, 0.48)',
    maxWidth: 470,
  },
};

export function projectFormDecorator(projectId: ProjectId): Decorator {
  const theme = PROJECT_THEMES[projectId];

  return (Story) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 24, right: 0, bottom: 0, left: 0 },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: '40px 24px',
          background: `${theme.pageOverlay}, ${theme.pageBackground}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: `${theme.maxWidth}px`,
            borderRadius: 24,
            padding: 24,
            background: theme.cardBackground,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: theme.shadow,
            color: theme.textColor,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                opacity: 0.75,
              }}
            >
              {projectId}
            </p>
            <h2 style={{ margin: '8px 0 0', fontSize: 22, color: theme.titleColor }}>
              Formulario em contexto de producao
            </h2>
          </div>
          <Story />
        </div>
      </div>
    </SafeAreaProvider>
  );
}

export function withDisabledFieldset(Story: () => JSX.Element): JSX.Element {
  return (
    <fieldset
      disabled
      style={{
        margin: 0,
        padding: 0,
        border: 0,
        opacity: 0.62,
        pointerEvents: 'none',
      }}
    >
      <Story />
    </fieldset>
  );
}

export const projectFormParameters = {
  layout: 'fullscreen' as const,
};
