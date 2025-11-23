/**
 * @fileoverview index.js に変換されるエントリーポイント。
 */
// node_modules の css ロード
import 'flatpickr/dist/themes/dark.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import AutoSaveManager from './AutoSaveManager';
import Store from './state/Store';
import MainWindow from './view/root/main-window';

// 全 css ファイルを require して watch 対応。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function requireAll(r: any) {
  r.keys().forEach(r);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
requireAll((require as any).context('./', true, /\.css$/));

// 描画
const container = document.getElementById('contents');
if (container) {
  const root = createRoot(container);
  root.render(
    <Provider store={Store}>
      <AutoSaveManager />
      <MainWindow />
    </Provider>,
  );
}

// EOF
