module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: process.env.BENCHMARK_COMPILER === '1' ? ['babel-plugin-react-compiler'] : [],
};
