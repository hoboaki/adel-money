import * as remote from '@electron/remote';
import ClassNames from 'classnames';
import { Menu } from 'electron';
import * as React from 'react';
import PageCalendar from 'src/view/page/calendar';
import PageImport from 'src/view/page/import';
import PageSetting from 'src/view/page/setting';
import PageSheet from 'src/view/page/sheet';
import PageStart from 'src/view/page/start';

import LayoutStyles from '../../Layout.css';
import Styles from './SideBar.css';
import SideBarBtn from './SideBarBtn';

interface IProps {
  currentPageId: string;
  onBtnClicked: (pageId: string, subPageId: string | null) => void;
}

class SideBar extends React.Component<IProps> {
  private settingMenu: Menu;

  public constructor(props: IProps) {
    super(props);

    // 設定メニューの作成
    this.settingMenu = new remote.Menu();
    this.settingMenu.append(
      new remote.MenuItem({
        label: '口座設定',
        click: () => {
          this.onSettingPageSelected(PageSetting.SubPageIdAccount);
        },
      }),
    );
    this.settingMenu.append(
      new remote.MenuItem({
        label: 'カテゴリ設定',
        click: () => {
          this.onSettingPageSelected(PageSetting.SubPageIdCategory);
        },
      }),
    );
  }

  public render() {
    const rootClass = ClassNames(Styles.Root, LayoutStyles.TopToBottom);

    const btnInfos = [];
    btnInfos.push({ pageId: PageCalendar.PageId, title: 'カレンダー', iconName: 'event_note' });
    btnInfos.push({ pageId: PageSheet.PageId, title: 'ワークシート', iconName: 'view_week' });
    // btnInfos.push({ pageId: 'Find', title: 'レコードの検索（準備中）', iconName: 'search' });
    btnInfos.push({ pageId: PageImport.PageId, title: 'レコードのインポート', iconName: 'input' });

    const btns = [];
    for (const btnInfo of btnInfos) {
      btns.push(
        <SideBarBtn
          key={btnInfo.pageId}
          onClicked={() => {
            this.onClicked(btnInfo.pageId);
          }}
          isActive={this.props.currentPageId === btnInfo.pageId}
          isEnabled={this.props.currentPageId !== PageStart.PageId}
          title={btnInfo.title}
          iconName={btnInfo.iconName}
        />,
      );
    }

    return (
      <div className={rootClass}>
        {btns}
        <div className={Styles.SettingBtnHolder}>
          <SideBarBtn
            onClicked={() => this.onSettingBtnClicked()}
            isActive={this.props.currentPageId === PageSetting.PageId}
            isEnabled={this.props.currentPageId !== PageStart.PageId}
            title="設定"
            iconName="settings"
          />
        </div>
      </div>
    );
  }

  private onClicked(pageId: string) {
    this.props.onBtnClicked(pageId, null);
  }

  private onSettingBtnClicked() {
    this.settingMenu.popup();
  }

  private onSettingPageSelected(subPageId: string) {
    this.props.onBtnClicked(PageSetting.PageId, subPageId);
  }
}

export default SideBar;
