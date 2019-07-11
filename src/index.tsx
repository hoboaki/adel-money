// インポート。
import React from 'react';
import ReactDom from 'react-dom';
import MainWindow from './MainWindow';

// node_modules の css ロード
import 'flatpickr/dist/themes/dark.css';
import 'jquery-contextmenu/dist/jquery.contextMenu.min.css';

// 全 css ファイルを require して watch 対応。
function requireAll(r: any) {
  r.keys().forEach(r);
}
requireAll((require as any).context('./', true, /\.css$/));

// 描画
const container = document.getElementById('contents');
ReactDom.render(
  <MainWindow/>,
  container,
);

// EOF
