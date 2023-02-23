const path = require('path');

module.exports = {
  entry: {
    otc: './src/otc.ts',
    yasdk: './src/yasdk.ts',
  },
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].min.js',
  },
  resolve: {
    extensions: ['.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {loader: 'ts-loader'},
        ],
      },
    ],
  },
};

