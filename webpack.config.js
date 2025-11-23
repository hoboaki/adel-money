const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (env) => {
  const prodMode = env !== undefined && env.prod;
  return {
    // node.js で動作することを指定する
    target: 'electron-renderer',
    // 起点となるファイル
    entry: './src/EntryPoint.tsx',
    // webpack watch したときに差分ビルドができる
    cache: true,
    // development は、 source map file を作成、再ビルド時間の短縮などの設定となる
    // production は、コードの圧縮やモジュールの最適化が行われる設定となる
    mode: prodMode ? 'production' : 'development',
    // ソースマップのタイプ
    devtool: prodMode ? false : 'source-map',
    // 出力先設定 __dirname は node でのカレントディレクトリのパスが格納される変数
    output: {
      path: path.join(__dirname, 'public'),
      filename: 'index.js',
      globalObject: 'self',
    },
    // ファイルタイプ毎の処理を記述する
    module: {
      rules: [
        {
          // 拡張子 .ts または .tsx の場合
          test: /\.tsx?$/,
          // TypeScript をコンパイルする
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.worker\.js$/,
          use: { loader: 'worker-loader' },
        },
        {
          // node_modules 以下の css は元のクラス名でロード
          test: /node_modules\/.*\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          // src 以下の css は名前衝突回避されたクラス名でロード
          test: /src\/.*\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                esModule: false,
                modules: {
                  localIdentName: '[name]__[local]--[hash:base64:5]',
                  exportLocalsConvention: 'asIs',
                },
              },
            },
          ],
        },
      ],
    },
    // 処理対象のファイルを記載する
    resolve: {
      extensions: [
        '.ts',
        '.tsx',
        '.js', // node_modulesのライブラリ読み込みに必要
      ],
      alias: {
        src: path.resolve('./src'),
      },
    },
    // プラグイン設定
    plugins: [new ESLintPlugin({ extensions: ['ts', 'tsx'] })],

  };
};
