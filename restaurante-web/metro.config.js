const { getSentryExpoConfig } = require('@sentry/react-native/metro')
const { withNativeWind } = require('nativewind/metro')

const config = getSentryExpoConfig(__dirname)

// Desabilitar Hermes para web
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
}

// Resolver customizado para ignorar módulos nativos no web
const defaultResolver = config.resolver.resolveRequest
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Ignorar react-native-esc-pos-printer no web
    if (platform === 'web' && moduleName === 'react-native-esc-pos-printer') {
      return {
        type: 'empty',
      }
    }
    // Usar resolver padrão para outros módulos
    if (defaultResolver) {
      return defaultResolver(context, moduleName, platform)
    }
    return context.resolveRequest(context, moduleName, platform)
  },
}

// Add exclusion list to prevent ENOENT errors from watcher
config.resolver.blockList = [
  // Exclude android/build and ios/build directories in node_modules
  /node_modules\/.*\/android\/build\/.*/,
  /node_modules\/.*\/ios\/build\/.*/,
]

module.exports = withNativeWind(config, {
  input: './global.css',
})
