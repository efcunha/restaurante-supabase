import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../src/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/features/admin/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/screens/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    {
      name: '@storybook/addon-mcp',
      options: {
        toolsets: {
          dev: true,
          docs: true,
        },
        experimentalFormat: 'markdown',
      },
    },
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  features: {
    experimentalComponentsManifest: true,
  },
  docs: {
    autodocs: false,
  },
  typescript: {
    reactDocgen: false,
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
      '@figma/code-connect$': false,
      '@': path.resolve(__dirname, '../src'),
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      console: false,
      fs: false,
      path: false,
    };

    config.module = config.module || { rules: [] };
    config.module.rules = config.module.rules || [];
    config.module.rules.unshift({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [require.resolve('babel-preset-expo')],
          plugins: [require.resolve('babel-plugin-react-native-web')],
        },
      },
    });
    config.module.rules.unshift({
      test: /\.(mjs|js|jsx|ts|tsx)$/,
      include: [
        /node_modules[\\/]@expo[\\/]vector-icons/,
        /node_modules[\\/]react-native-vector-icons/,
        /node_modules[\\/]react-native-web/,
        /node_modules[\\/]react-native/,
        /node_modules[\\/]@react-native/,
        /node_modules[\\/]expo/,
        /node_modules[\\/]@expo/,
      ],
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [require.resolve('babel-preset-expo')],
        },
      },
    });

    return config;
  },
};

export default config;
