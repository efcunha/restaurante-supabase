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
        alias: [
          { find: 'events', replacement: path.resolve(__dirname, './shims/eventsNodeShim.js') },
          {
            find: 'node:events',
            replacement: path.resolve(__dirname, './shims/eventsNodeShim.js'),
          },
          { find: 'util', replacement: path.resolve(__dirname, './shims/utilShim.js') },
          { find: 'node:util', replacement: path.resolve(__dirname, './shims/utilShim.js') },
          { find: 'stream', replacement: path.resolve(__dirname, './shims/streamShim.js') },
          { find: 'node:stream', replacement: path.resolve(__dirname, './shims/streamShim.js') },
          {
            find: 'react-native/Libraries/Utilities/codegenNativeComponent',
            replacement: path.resolve(__dirname, './shims/codegenNativeComponent.js'),
          },
          {
            find: 'react-native/Libraries/Image/resolveAssetSource',
            replacement: path.resolve(__dirname, './shims/resolveAssetSource.js'),
          },
          {
            find: 'expo-modules-core/src/requireNativeModule',
            replacement: path.resolve(__dirname, './shims/requireNativeModule.js'),
          },
          {
            find: 'expo-modules-core/src/requireNativeModule.ts',
            replacement: path.resolve(__dirname, './shims/requireNativeModule.js'),
          },
          {
            find: '../context/AuthContext',
            replacement: path.resolve(__dirname, './shims/authContextApp.js'),
          },
          {
            find: '../../../context/AuthContext',
            replacement: path.resolve(__dirname, './shims/authContextApp.js'),
          },
          {
            find: '../context/ToastContext',
            replacement: path.resolve(__dirname, './shims/toastContextApp.js'),
          },
          {
            find: '../config/SupabaseConfig',
            replacement: path.resolve(__dirname, './shims/supabaseConfigStorybook.js'),
          },
          {
            find: '../services/CaixaService',
            replacement: path.resolve(__dirname, './shims/caixaServiceStorybook.js'),
          },
          {
            find: '../services/CompanySettingsService',
            replacement: path.resolve(__dirname, './shims/companySettingsServiceStorybook.js'),
          },
          {
            find: '../services/ProductService',
            replacement: path.resolve(__dirname, './shims/productServiceStorybook.js'),
          },
          {
            find: '../components/KeyboardWrapper',
            replacement: path.resolve(__dirname, './shims/keyboardWrapperStorybook.js'),
          },
          {
            find: 'react-native-safe-area-context',
            replacement: path.resolve(__dirname, './shims/safeAreaContext.js'),
          },
          {
            find: /^react-native$/,
            replacement: path.resolve(__dirname, './shims/reactNativeWebCompat.js'),
          },
          {
            find: 'react-native-esc-pos-printer',
            replacement: path.resolve(__dirname, './shims/reactNativeEscPosPrinter.js'),
          },
          {
            find: '@react-native-community/netinfo',
            replacement: path.resolve(__dirname, './shims/reactNativeNetInfo.js'),
          },
          {
            find: '@react-native-community/netinfo/lib/module/index.js',
            replacement: path.resolve(__dirname, './shims/reactNativeNetInfo.js'),
          },
          {
            find: '@react-native-community/netinfo/lib/commonjs/index.js',
            replacement: path.resolve(__dirname, './shims/reactNativeNetInfo.js'),
          },
          {
            find: '@react-native-community/netinfo/src/index.ts',
            replacement: path.resolve(__dirname, './shims/reactNativeNetInfo.js'),
          },
          { find: 'expo-font', replacement: path.resolve(__dirname, './shims/expoFont.js') },
          {
            find: 'expo-font/build/Font',
            replacement: path.resolve(__dirname, './shims/expoFont.js'),
          },
          {
            find: 'expo-font/build/index',
            replacement: path.resolve(__dirname, './shims/expoFont.js'),
          },
          {
            find: 'expo-modules-core',
            replacement: path.resolve(__dirname, './shims/expoModulesCore.js'),
          },
          {
            find: 'expo-modules-core/build/index',
            replacement: path.resolve(__dirname, './shims/expoModulesCore.js'),
          },
          { find: '@', replacement: path.resolve(__dirname, '../restaurante-site/src') },
          { find: '@restaurante/ui', replacement: path.resolve(__dirname, '../packages/ui/src') },
          {
            find: '@restaurante/schemas',
            replacement: path.resolve(__dirname, '../packages/schemas/src'),
          },
          {
            find: '@restaurante/tokens',
            replacement: path.resolve(__dirname, '../packages/tokens/src'),
          },
        ],
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
        exclude: [
          'react-native-esc-pos-printer',
          'p-queue',
          'expo-font',
          'expo-modules-core',
          '@react-native-community/netinfo',
        ],
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
            if (id === 'react-native/Libraries/Image/resolveAssetSource') {
              return path.resolve(__dirname, './shims/resolveAssetSource.js');
            }
            if (
              id === '@react-native-community/netinfo' ||
              id.startsWith('@react-native-community/netinfo/')
            ) {
              return path.resolve(__dirname, './shims/reactNativeNetInfo.js');
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
