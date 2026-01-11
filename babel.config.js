export default function (api) {
  api.cache(true);

  return {
    // Reanimated v4 moved its Babel plugin to the `react-native-worklets` package.
    // Keeping this correct avoids runtime warnings and ensures worklets are compiled.
    plugins: ['react-native-worklets/plugin'],
    presets: [
      '@nkzw/babel-preset-fbtee',
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
}
