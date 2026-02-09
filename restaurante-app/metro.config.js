const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Desabilitar Hermes para web
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Resolver customizado para ignorar módulos nativos no web
const defaultResolver = config.resolver.resolveRequest;
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Ignorar react-native-esc-pos-printer no web
    if (platform === 'web' && moduleName === 'react-native-esc-pos-printer') {
      return {
        type: 'empty',
      };
    }
    // Usar resolver padrão para outros módulos
    if (defaultResolver) {
      return defaultResolver(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
