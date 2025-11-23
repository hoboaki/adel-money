import * as remote from '@electron/remote';
import ClassNames from 'classnames';
import * as Fs from 'fs';
import * as React from 'react';
import * as LocalSettingRootUtils from 'src/data-model/local-setting/RootUtils';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';

import PageStyles from '../Page.css';
import Styles from './Main.css';
import MainBtn from './MainBtn';

interface IProps {
  onNewFromTemplate: () => void;
  onNewFromMmxfSelected: (filePath: string) => void;
  onNewExampleSelected: () => void;
  onOpenFileSelected: (filePath: string) => void;
}

interface IState {
  latestOpenFilePath: string | null;
}

class Main extends React.Component<IProps, IState> {
  public static PageId = 'Start';
  private static BtnIdOpenLatest = 'OpenLatest';
  private static BtnIdOpenFile = 'OpenFile';
  private static BtnIdNewFromTemplate = 'NewFromTemplate';
  private static BtnIdNewFromMmxf = 'NewFromMmxf';

  public constructor(props: IProps) {
    super(props);
    this.state = {
      latestOpenFilePath: null,
    };
  }

  public componentDidMount() {
    // 最後に開いたファイルを開くための情報ロード
    LocalSettingRootUtils.load((root) => {
      const filePath = root.latestOpenFilePath;
      Fs.access(filePath, Fs.constants.R_OK, (err) => {
        if (err === null) {
          this.setState({
            latestOpenFilePath: filePath,
          });
        }
      });
    });
  }

  public render() {
    const rootClass = ClassNames(PageStyles.Base, Styles.Root);

    const openBtnInfos = [];
    openBtnInfos.push({
      btnId: Main.BtnIdOpenLatest,
      title: '最後に開いたファイルを開く',
      iconName: 'payment',
      isEnabled: this.state.latestOpenFilePath !== null,
    });
    openBtnInfos.push({
      btnId: Main.BtnIdOpenFile,
      title: 'ファイルを指定して開く',
      iconName: 'class',
      isEnabled: true,
    });

    const newBtnInfos = [];
    newBtnInfos.push({
      btnId: Main.BtnIdNewFromTemplate,
      title: 'テンプレートから新規作成',
      iconName: 'class',
      isEnabled: true,
    });
    newBtnInfos.push({
      btnId: Main.BtnIdNewFromMmxf,
      title: 'MasterMoney ファイル (mmxf) から新規作成',
      iconName: 'class',
      isEnabled: true,
    });

    const openBtns: JSX.Element[] = [];
    openBtnInfos.forEach((btnInfo) => {
      openBtns.push(
        <MainBtn
          key={btnInfo.btnId}
          onClicked={(metaKey) => {
            this.onClicked(btnInfo.btnId, metaKey);
          }}
          isEnabled={btnInfo.isEnabled}
          title={btnInfo.title}
        />,
      );
    });

    const newBtns: JSX.Element[] = [];
    newBtnInfos.forEach((btnInfo) => {
      newBtns.push(
        <MainBtn
          key={btnInfo.btnId}
          onClicked={(metaKey) => {
            this.onClicked(btnInfo.btnId, metaKey);
          }}
          isEnabled={btnInfo.isEnabled}
          title={btnInfo.title}
        />,
      );
    });

    return (
      <div className={rootClass}>
        <div className={Styles.BtnContainer}>
          <span className={Styles.Label}>ファイルを開く</span>
          {openBtns}
          <span className={Styles.Label}>新規作成</span>
          {newBtns}
        </div>
      </div>
    );
  }

  private onClicked(btnId: string, metaKey: boolean) {
    switch (btnId) {
      case Main.BtnIdOpenLatest:
        if (this.state.latestOpenFilePath !== null) {
          this.props.onOpenFileSelected(this.state.latestOpenFilePath);
        }
        break;

      case Main.BtnIdOpenFile: {
        const dialog = remote.dialog;
        const filePaths = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
          properties: ['openFile'],
          filters: [
            {
              name: 'AdelMoney ドキュメント',
              extensions: ['amdoc'],
            },
          ],
        });
        if (filePaths === undefined || filePaths.length === 0) {
          return;
        }
        this.props.onOpenFileSelected(filePaths[0]);
        break;
      }

      case Main.BtnIdNewFromTemplate:
        if (metaKey) {
          NativeDialogUtils.showInfoDialog(
            `新規作成`,
            'Command キーを押しながらボタンを押したため動作確認用のドキュメントデータを使って作成します。',
            undefined,
          );
          this.props.onNewExampleSelected();
        } else {
          this.props.onNewFromTemplate();
        }
        break;

      case Main.BtnIdNewFromMmxf: {
        const dialog = remote.dialog;
        const filePaths = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
          properties: ['openFile'],
          filters: [
            {
              name: 'MasterMoney ファイル',
              extensions: ['mmxf'],
            },
          ],
        });
        if (filePaths === undefined || filePaths.length === 0) {
          return;
        }
        this.props.onNewFromMmxfSelected(filePaths[0]);
        break;
      }
    }
  }
}

export default Main;
