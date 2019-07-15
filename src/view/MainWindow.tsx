import ClassNames from 'classnames';
import {ipcRenderer as IpcRenderer} from 'electron';
import * as React from 'react';
import Split from 'split.js';
import ModelSampleDoc from '../Model/SampleDoc';
import LayoutStyle from './Layout.css';
import * as MainWindowStyle from './MainWindow.css';
import PageStyle from './Page.css';
import PageHome from './PageHome';
import PageSheet from './PageSheet';
import SideBar from './SideBar';
import TitleBar from './TitleBar';

interface IState {
  currentPageId: string;
  isActive: boolean;
}

enum Color {
  Red = 0,
}
class MainWindow extends React.Component<any, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      currentPageId: '',
      isActive: true,
    };
  }

  public componentDidMount() {
    // テスト実行
    ModelSampleDoc.Test();

    // Focus/Unfocus 切替
    window.onload = () => {
      IpcRenderer.on('app-message', (event: any, msg: string) => {
        switch (msg) {
          case 'focus':
            this.setState({isActive: true});
            break;

          case 'blur':
            this.setState({isActive: false});
            break;
        }
      });

      // スプリッター設定
      // PageSheet でスプリッターを使用しないことが確定したらこのコメントアウト群を消す。
      // Split(['#pageSheetBodyTop', '#pageSheetBodyBottom'], {
      //   direction: 'vertical',
      //   elementStyle: (dimension, size, gutterSize) => {
      //     const reservedHeight = 44; // タイトルバー + ヘッダーエリア
      //     return {
      //       height: `calc(${size}% - ${gutterSize}px - ${reservedHeight}px)`,
      //     };
      //   },
      //   gutterSize: 8,
      //   minSize: 200,
      //   sizes: [25, 75],
      // });
    };

    // ページ有効化
    this.activatePage(PageHome.PageId);
  }

  public render() {
    let pageContent = <div className={PageStyle.Base}/>;
    switch (this.state.currentPageId) {
      case PageHome.PageId:
        pageContent = <PageHome />;
        break;
      case PageSheet.PageId:
        pageContent = <PageSheet />;
        break;
    }

    const rootClass = ClassNames(
      MainWindowStyle.Root,
      LayoutStyle.TopToBottom,
    );
    return (
      <div className={rootClass}>
        <TitleBar isActive={this.state.isActive}/>
        <div className={LayoutStyle.LeftToRight}>
          <SideBar
            onBtnClicked={(pageId) => {this.onPageBtnClicked(pageId); }}
            currentPageId={this.state.currentPageId}
            />
          {pageContent}
        </div>
      </div>
    );
  }

  private onPageBtnClicked(pageId: string) {
    // 変更がなければ何もしない
    if (this.state.currentPageId === pageId) {
      return;
    }

    // ページの有効化
    this.activatePage(pageId);
  }

  private activatePage(pageId: string) {
    this.setState({currentPageId: pageId});
  }
}

export default MainWindow;