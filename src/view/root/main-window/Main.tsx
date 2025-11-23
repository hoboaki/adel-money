import * as remote from '@electron/remote';
import ClassNames from 'classnames';
import { ipcRenderer as IpcRenderer } from 'electron';
import * as Fs from 'fs';
import * as React from 'react';
import DataModelDocRoot from 'src/data-model/doc/Root';
import * as DataModelDocRootUtils from 'src/data-model/doc/RootUtils';
import * as DataModelLocalSettingRootUtils from 'src/data-model/local-setting/RootUtils';
import * as DocActions from 'src/state/doc/Actions';
import * as DocStateMethods from 'src/state/doc/StateMethods';
import * as DocStates from 'src/state/doc/States';
import SampleDoc from 'src/state/SampleDoc';
import Store from 'src/state/Store';
import TemplateDoc from 'src/state/TemplateDoc';
import * as UiActions from 'src/state/ui/Actions';
import * as MmxfImporter from 'src/util/doc/MmxfImporter';
import LayoutStyle from 'src/view/Layout.css';
import PageCalendar from 'src/view/page/calendar';
import PageImport from 'src/view/page/import';
import PageStyles from 'src/view/page/Page.css';
import PageSetting from 'src/view/page/setting';
import PageSheet from 'src/view/page/sheet';
import PageStart from 'src/view/page/start';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';

import Styles from './Main.css';
import SideBar from './SideBar';
import TitleBar from './TitleBar';

interface IState {
  currentPageId: string;
  isActive: boolean;
  isFullScreen: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class MainWindow extends React.Component<any, IState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(props: any) {
    super(props);
    this.state = {
      currentPageId: '',
      isActive: true,
      isFullScreen: false,
    };
  }

  public componentDidMount() {
    // テスト実行
    SampleDoc.Test();

    // Focus/Unfocus 切替
    window.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      IpcRenderer.on('app-message', (event: any, msg: string) => {
        switch (msg) {
          case 'focus':
            this.setState({ isActive: true });
            break;

          case 'blur':
            this.setState({ isActive: false });
            break;

          case 'enter-full-screen':
            this.setState({ isFullScreen: true });
            break;

          case 'leave-full-screen':
            this.setState({ isFullScreen: false });
            break;
        }
      });
    };

    // ページ有効化
    this.activatePage(PageStart.PageId);
  }

  public render() {
    let pageContent = <div className={PageStyles.Base} />;
    switch (this.state.currentPageId) {
      case PageStart.PageId:
        pageContent = (
          <PageStart
            onOpenFileSelected={(filePath) => {
              this.pageStartOnOpenFileSelected(filePath);
            }}
            onNewFromTemplate={() => {
              this.pageStartOnNewFromTemplate();
            }}
            onNewFromMmxfSelected={(filePath) => {
              this.pageStartOnNewFromMmxfSelected(filePath);
            }}
            onNewExampleSelected={() => {
              this.pageStartOnNewExampleSelected();
            }}
          />
        );
        break;
      case PageCalendar.PageId:
        pageContent = <PageCalendar />;
        break;
      case PageSheet.PageId:
        pageContent = <PageSheet />;
        break;
      case PageImport.PageId:
        pageContent = <PageImport />;
        break;
      case PageSetting.PageId:
        pageContent = <PageSetting />;
        break;
    }

    const rootClass = ClassNames(Styles.Root, LayoutStyle.TopToBottom);
    const titleBar = this.state.isFullScreen ? null : <TitleBar isActive={this.state.isActive} />;
    const nonTitleBarAreaClass = ClassNames(LayoutStyle.LeftToRight, Styles.NonTitleBarArea);
    return (
      <div className={rootClass}>
        {titleBar}
        <div className={nonTitleBarAreaClass}>
          <SideBar
            onBtnClicked={(pageId, subPageId) => {
              this.onPageBtnClicked(pageId, subPageId);
            }}
            currentPageId={this.state.currentPageId}
          />
          {pageContent}
        </div>
      </div>
    );
  }

  private pageStartOnOpenFileSelected(filePath: string) {
    // ファイルリード
    let jsonText = '';
    try {
      jsonText = Fs.readFileSync(filePath, { encoding: 'utf-8' });
    } catch (err) {
      global.console.log(`Can't read document '${filePath}'.`);
      global.console.log(err.message);
      this.showErrorDialog(
        'ファイルの読み込みに失敗しました。',
        'ファイルが存在していることと，ファイルを読み取る権限があることを確認してください。',
      );
      return;
    }

    // データ化
    let data: DataModelDocRoot | null = null;
    try {
      data = DataModelDocRootUtils.fromJson(jsonText);
    } catch (err) {
      global.console.log(`Can't parse json '${filePath}'.`);
      global.console.log(err.message);
      this.showErrorDialog('ファイルの解析に失敗しました。', 'ファイルが壊れている可能性があります。');
      return;
    }
    if (data === null) {
      return;
    }

    // ドキュメント化
    const doc = DocStateMethods.fromData(data);

    // スタート
    this.startEditDocument(doc, filePath, false);
  }

  private pageStartOnNewFromTemplate() {
    // 自動保存先を選択
    const autoSaveFilePath = this.selectAutoSaveFilePath();
    if (autoSaveFilePath === null) {
      return;
    }

    // テンプレートドキュメントでスタート
    this.startEditDocument(TemplateDoc.Create(), autoSaveFilePath, true);
  }

  private pageStartOnNewFromMmxfSelected(filePath: string) {
    // ファイルを開く
    let resetDoc: DocStates.IState | null = null;
    const mmxfFilePath = filePath;
    try {
      Fs.accessSync(mmxfFilePath, Fs.constants.R_OK);
    } catch (err) {
      global.console.log(`Can't access document '${mmxfFilePath}'.`);
      global.console.log(err.message);
      this.showErrorDialog(
        '指定のファイルにアクセスできませんでした。',
        'ファイルが存在していることと，ファイルを読み取る権限があることを確認してください。',
      );
      return;
    }
    {
      const result = MmxfImporter.importFile(mmxfFilePath);
      if (result.doc === null) {
        const appendErrMsg = `\n\nエラー詳細：\n・${result.errorMsgs.join('\n・')}`;
        this.showErrorDialog(
          'ファイルのインポート処理中にエラーが発生しました。',
          'ファイルが壊れているか，未対応のデータフォーマットの可能性があります。' + appendErrMsg,
        );
        global.console.log(result.errorMsgs);
        return;
      }
      resetDoc = result.doc;
    }

    // 自動保存先を選択
    const autoSaveFilePath = this.selectAutoSaveFilePath();
    if (autoSaveFilePath === null) {
      return;
    }

    // スタート
    this.startEditDocument(resetDoc, autoSaveFilePath, true);
  }

  private pageStartOnNewExampleSelected() {
    // 自動保存先を選択
    const autoSaveFilePath = this.selectAutoSaveFilePath();
    if (autoSaveFilePath === null) {
      return;
    }

    // サンプルドキュメントでスタート
    this.startEditDocument(SampleDoc.Create(), autoSaveFilePath, true);
  }

  // 自動保存先をユーザーに尋ねる。キャンセルされたら null が返る。
  private selectAutoSaveFilePath(): string | null {
    // 事前説明ダイアログ
    NativeDialogUtils.showInfoDialog(
      '初期設定',
      'このあと表示されるダイアログを使用し，ファイルの保存先を設定してください。',
      '本アプリケーションはファイルを自動保存します。そのため最初にファイルの保存先を設定する必要があります。',
    );

    // 保存先選択
    const dialog = remote.dialog;
    const filePath = dialog.showSaveDialogSync(remote.getCurrentWindow(), {
      filters: [
        {
          name: 'AdelMoney ドキュメント',
          extensions: ['amdoc'],
        },
      ],
    });
    if (filePath === undefined) {
      return null;
    }
    return filePath;
  }

  // ドキュメント編集の開始処理
  private startEditDocument(doc: DocStates.IState, filePath: string, isNeedToSave: boolean) {
    // 保存
    if (isNeedToSave) {
      const jsonText = DataModelDocRootUtils.toJson(DocStateMethods.toData(doc));
      try {
        Fs.writeFileSync(filePath, jsonText, { encoding: 'utf-8' });
      } catch (err) {
        this.showErrorDialog(
          'ファイルの保存に失敗しました。',
          'ストレージの容量が不足しているか，書き込み権限があるか確認してください。',
        );
        throw err;
      }
    }

    // リセット処理
    Store.dispatch(DocActions.resetDocument(doc));
    Store.dispatch(UiActions.documentSetFilePath(filePath));

    // Page変更
    this.activatePage(PageCalendar.PageId);

    // 最後に開いたファイルの情報を保存
    DataModelLocalSettingRootUtils.load((root) => {
      root.latestOpenFilePath = filePath;
      DataModelLocalSettingRootUtils.save(root);
    });
  }

  private showErrorDialog(msg: string, detail: string) {
    NativeDialogUtils.showErrorDialog('スタートページ', msg, detail);
  }

  private onPageBtnClicked(pageId: string, subPageId: string | null) {
    // もし設定ページならサブページを設定
    if (pageId === PageSetting.PageId) {
      if (subPageId === null) {
        throw new Error();
      }
      Store.dispatch(UiActions.settingUpdateSubPage(subPageId));
    }

    // 変更がなければ何もしない
    if (this.state.currentPageId === pageId) {
      return;
    }

    // ページの有効化
    this.activatePage(pageId);
  }

  private activatePage(pageId: string) {
    // ページ変更
    this.setState({ currentPageId: pageId });
  }
}

export default MainWindow;
