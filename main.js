/**
 * @fileOverview
 * エントリーポイント。
 */
const { app, globalShortcut, BrowserWindow, Menu } = require('electron');
const windowStateKeeper = require('electron-window-state');
require('@electron/remote/main').initialize();

//------------------------------------------------------------------------------
// メニューバー設定
const appDisplayName = 'AdelMoney';
const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';
const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
      {
        label: '', // 強制的に上書きされるので空文字列にしておく
        submenu: [
          { role: 'about', label: `${appDisplayName}について` },
          { type: 'separator' },
          { role: 'services', label: 'サービス' },
          { type: 'separator' },
          { role: 'hide', label: `${appDisplayName}を隠す` },
          { role: 'hideothers', label: 'ほかを隠す' },
          { role: 'unhide', label: 'すべてを表示' },
          { type: 'separator' },
          { role: 'quit', label: `${appDisplayName}を終了` },
        ],
      },
    ]
    : []),
  // { role: 'fileMenu' }
  {
    label: 'ファイル',
    submenu: [
      {
        label: '新規ウィンドウ',
        accelerator: 'CmdOrCtrl+Shift+N',
        click: async () => {
          createWindow();
        },
      },
      ...[isMac ? { role: 'close', label: '閉じる' } : { role: 'quit', label: '終了' }],
    ],
  },
  // { role: 'editMenu' }
  {
    label: '編集',
    submenu: [
      { role: 'undo', label: '取り消す' },
      { role: 'redo', label: 'やり直す' },
      { type: 'separator' },
      { role: 'cut', label: 'カット' },
      { role: 'copy', label: 'コピー' },
      { role: 'paste', label: 'ペースト' },
      ...(isMac
        ? [
          { role: 'pasteAndMatchStyle', label: 'ペーストしてスタイルを合わせる' },
          { role: 'delete', label: '削除' },
          { role: 'selectAll', label: 'すべてを選択' },
          { type: 'separator' },
          {
            label: 'スピーチ',
            submenu: [{ role: 'startspeaking' }, { role: 'stopspeaking' }],
          },
        ]
        : [{ role: 'delete', label: '削除' }, { type: 'separator' }, { role: 'selectAll', label: 'すべてを選択' }]),
    ],
  },
  // { role: 'viewMenu' }
  {
    label: '表示',
    submenu: [
      ...(isDev
        ? [{ role: 'reload' }, { role: 'forcereload' }, { role: 'toggledevtools' }, { type: 'separator' }]
        : []),
      { role: 'resetzoom', label: '実際のサイズ' },
      { role: 'zoomout', label: '拡大' },
      { role: 'zoomin', label: '縮小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'フルスクリーンにする', sublabel: 'フルスクリーンを解除' },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: 'ウィンドウ',
    role: 'window',
    submenu: [
      { role: 'minimize', label: 'しまう' },
      { role: 'zoom', label: '拡大／縮小' },
      ...(isMac
        ? [{ type: 'separator' }, { role: 'front', label: 'すべてを手前に移動' }, { type: 'separator' }]
        : [{ role: 'close', label: '閉じる' }]),
    ],
  },
  {
    role: 'help',
    // submenu: [
    //   {
    //     label: 'Learn More',
    //     click: async () => {
    //       const { shell } = require('electron');
    //       await shell.openExternal('https://electronjs.org');
    //     },
    //   },
    // ],
  },
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

//------------------------------------------------------------------------------
// Dock メニュー設定
const dockMenu = Menu.buildFromTemplate([
  {
    label: '新規ウィンドウ',
    click() {
      createWindow();
    },
  },
]);

//------------------------------------------------------------------------------
// ウィンドウ管理
let windows = [];

// 新規ウィンドウ作成関数
function createWindow() {
  // ウィンドウ作成
  const state = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 600,
  });
  const newWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 600,
    minHeight: 460,
    titleBarStyle: 'hidden',
    backgroundColor: '#f5f5f6',
    webPreferences: {
      devTools: isDev,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  state.manage(newWindow);
  require('@electron/remote/main').enable(newWindow.webContents);

  //newWindow.setMenuBarVisibility(false);

  // ウィンドウ管理追加処理
  windows.push(newWindow);

  // 各種イベント対応
  newWindow.on('closed', () => {
    windows = windows.filter((win) => win !== newWindow);
  });
  newWindow.on('focus', () => {
    newWindow.webContents.send('app-message', 'focus');
  });
  newWindow.on('blur', () => {
    newWindow.webContents.send('app-message', 'blur');
  });
  newWindow.on('enter-full-screen', () => {
    newWindow.webContents.send('app-message', 'enter-full-screen');
  });
  newWindow.on('leave-full-screen', () => {
    newWindow.webContents.send('app-message', 'leave-full-screen');
  });

  // 内容初期化
  newWindow.loadFile('public/index.html');
}

//------------------------------------------------------------------------------
// アプリケーションイベント

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  Menu.setApplicationMenu(menu);
  app.dock.setMenu(dockMenu);
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.length === 0) {
    createWindow();
  }
});

// EOF
