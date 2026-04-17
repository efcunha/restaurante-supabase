module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@restaurante/ui': '../packages/ui/src',
            '@restaurante/tokens': '../packages/tokens/src',
            '@restaurante/schemas': '../packages/schemas/src',
            '@restaurante/config': '../packages/config/src',
          },
        },
      ],
      'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  }
}
