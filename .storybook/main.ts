import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['./stories/**/*.stories.tsx', './stories/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          ...(baseConfig.resolve?.alias ?? {}),
          events: path.resolve(__dirname, './shims/eventsNodeShim.js'),
          'node:events': path.resolve(__dirname, './shims/eventsNodeShim.js'),
          util: path.resolve(__dirname, './shims/utilShim.js'),
          'node:util': path.resolve(__dirname, './shims/utilShim.js'),
          stream: path.resolve(__dirname, './shims/streamShim.js'),
          'node:stream': path.resolve(__dirname, './shims/streamShim.js'),
          'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(
            __dirname,
            './shims/codegenNativeComponent.js',
          ),
          'expo-modules-core/src/requireNativeModule': path.resolve(
            __dirname,
            './shims/requireNativeModule.js',
          ),
          'expo-modules-core/src/requireNativeModule.ts': path.resolve(
            __dirname,
            './shims/requireNativeModule.js',
          ),
          '../context/AuthContext': path.resolve(__dirname, './shims/authContextApp.js'),
          '../../../context/AuthContext': path.resolve(__dirname, './shims/authContextApp.js'),
          '../context/ToastContext': path.resolve(__dirname, './shims/toastContextApp.js'),
          '../config/SupabaseConfig': path.resolve(__dirname, './shims/supabaseConfigStorybook.js'),
          '../services/CaixaService': path.resolve(__dirname, './shims/caixaServiceStorybook.js'),
          '../services/CompanySettingsService': path.resolve(
            __dirname,
            './shims/companySettingsServiceStorybook.js',
          ),
          '../services/ProductService': path.resolve(
            __dirname,
            './shims/productServiceStorybook.js',
          ),
          '../components/KeyboardWrapper': path.resolve(
            __dirname,
            './shims/keyboardWrapperStorybook.js',
          ),
          'react-native-safe-area-context': path.resolve(__dirname, './shims/safeAreaContext.js'),
          'react-native': path.resolve(__dirname, './shims/reactNativeWebCompat.js'),
          'react-native-esc-pos-printer': path.resolve(
            __dirname,
            './shims/reactNativeEscPosPrinter.js',
          ),
          'expo-font': path.resolve(__dirname, './shims/expoFont.js'),
          'expo-font/build/Font': path.resolve(__dirname, './shims/expoFont.js'),
          'expo-font/build/index': path.resolve(__dirname, './shims/expoFont.js'),
          'expo-modules-core': path.resolve(__dirname, './shims/expoModulesCore.js'),
          'expo-modules-core/build/index': path.resolve(__dirname, './shims/expoModulesCore.js'),
          '@': path.resolve(__dirname, '../restaurante-site/src'),
          '@restaurante/ui': path.resolve(__dirname, '../packages/ui/src'),
          '@restaurante/schemas': path.resolve(__dirname, '../packages/schemas/src'),
          '@restaurante/tokens': path.resolve(__dirname, '../packages/tokens/src'),
        },
      },
      define: {
        __DEV__: true,
        'process.env.NODE_ENV': JSON.stringify('development'),
        'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('https://example.supabase.co'),
      },
      esbuild: {
        jsx: 'automatic',
      },
      optimizeDeps: {
        esbuildOptions: {
          loader: {
            '.js': 'jsx',
          },
        },
        include: ['events', 'util', 'stream'],
        exclude: ['react-native-esc-pos-printer', 'p-queue', 'expo-font', 'expo-modules-core'],
      },
      plugins: [
        {
          name: 'node-modules-polyfill-interceptor',
          resolveId(id) {
            if (id === 'events' || id === 'node:events') {
              return path.resolve(__dirname, './shims/eventsNodeShim.js');
            }
            if (id === 'util' || id === 'node:util') {
              return path.resolve(__dirname, './shims/utilShim.js');
            }
            if (id === 'stream' || id === 'node:stream') {
              return path.resolve(__dirname, './shims/streamShim.js');
            }
            if (id === 'react-native-esc-pos-printer') {
              return path.resolve(__dirname, './shims/reactNativeEscPosPrinter.js');
            }
            if (
              id === 'expo-font' ||
              id === 'expo-font/build/Font' ||
              id === 'expo-font/build/index'
            ) {
              return path.resolve(__dirname, './shims/expoFont.js');
            }
            if (id === 'expo-modules-core' || id === 'expo-modules-core/build/index') {
              return path.resolve(__dirname, './shims/expoModulesCore.js');
            }
            return null;
          },
        },
      ],
    });
  },
};

export default config;
