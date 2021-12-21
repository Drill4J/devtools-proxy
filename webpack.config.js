const path = require('path');
const nodeExternals = require('webpack-node-externals');
console.log('process.env.NODE_ENV', process.env.NODE_ENV);
module.exports = {
  mode: process.env.NODE_ENV,
  target: 'node',
  externals: [nodeExternals()],
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        enforce: 'pre',
        exclude: /(node_modules|\.spec\.ts)/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : undefined,
  watch: process.env.NODE_ENV === 'development',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
