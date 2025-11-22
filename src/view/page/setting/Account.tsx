import ClassNames from 'classnames';
import { Menu } from 'electron';
import * as remote from '@electron/remote';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import Sortable from 'sortablejs';
import * as DocActions from 'src/state/doc/Actions';
import * as DocStateMethods from 'src/state/doc/StateMethods';
import * as DocStates from 'src/state/doc/States';
import * as DocTypes from 'src/state/doc/Types';
import IStoreState from 'src/state/IStoreState';
import Store from 'src/state/Store';
import * as UiActions from 'src/state/ui/Actions';
import BasicStyles from 'src/view/Basic.css';
import LayoutStyles from 'src/view/Layout.css';
import PageStyles from 'src/view/page/Page.css';
import AggregateAccountEditDialog from 'src/view/widget/aggregate-account-edit-dialog';
import BasicAccountEditDialog from 'src/view/widget/basic-account-edit-dialog';
import MaterialIcon from 'src/view/widget/material-icon';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';
import RadioButtonGroup from 'src/view/widget/radio-button-group';
import { v4 as UUID } from 'uuid';

import Styles from './Account.css';
import Header from './Header';

interface IProps {
  doc: DocStates.IState;
}

interface IState {
  /** 選択中のタブ。 */
  selectedTab: DocTypes.AccountKind;

  /** 口座編集ダイアログの口座種類。 */
  dialogAccountKind: DocTypes.AccountKind;

  /** 口座編集対象。 */
  editAccountId: number | null;

  /** カードのコンテキストメニュー表示中か。 */
  cardActionMenuActive: boolean;

  /** 口座編集ダイアログをモーダル中か。 */
  modalAccountEdit: boolean;
}

class Account extends React.Component<IProps, IState> {
  private addActionMenu: Menu;
  private cardActionMenu: Menu;
  private elemIdAccountList: string;

  public constructor(props: IProps) {
    super(props);
    this.state = {
      selectedTab: DocTypes.AccountKind.Assets,
      dialogAccountKind: DocTypes.AccountKind.Assets,
      editAccountId: null,
      modalAccountEdit: false,
      cardActionMenuActive: false,
    };
    this.elemIdAccountList = `elem-${UUID()}`;

    // 追加アクションMenu
    const addAction = (kind: DocTypes.AccountKind) => {
      this.setState({
        dialogAccountKind: kind,
        editAccountId: null,
        modalAccountEdit: true,
      });
    };
    this.addActionMenu = new remote.Menu();
    this.addActionMenu.append(
      new remote.MenuItem({
        label: '資産口座を作成...',
        click: () => {
          addAction(DocTypes.AccountKind.Assets);
        },
      }),
    );
    this.addActionMenu.append(
      new remote.MenuItem({
        label: '負債口座を作成...',
        click: () => {
          addAction(DocTypes.AccountKind.Liabilities);
        },
      }),
    );
    this.addActionMenu.append(
      new remote.MenuItem({
        label: '集計口座を作成...',
        click: () => {
          addAction(DocTypes.AccountKind.Aggregate);
        },
      }),
    );

    // カードアクションMenu
    this.cardActionMenu = new remote.Menu();
    this.cardActionMenu.append(
      new remote.MenuItem({
        label: '編集...',
        click: () => {
          this.setState({ modalAccountEdit: true });
        },
      }),
    );
    this.cardActionMenu.append(
      new remote.MenuItem({
        label: '削除...',
        click: () => {
          this.accountDelete();
        },
      }),
    );
  }

  public componentDidMount() {
    // 並び替えUIのセットアップ
    const elem = document.getElementById(`${this.elemIdAccountList}`);
    if (elem === null) {
      throw new Error();
    }
    Sortable.create(elem, {
      animation: 150,
      ghostClass: Styles.AccountCardGhost,
      handle: `.${Styles.AccountCardHandle}`,
      onEnd: (evt) => {
        // 値チェック
        if (evt.newIndex === undefined || evt.oldIndex === undefined) {
          throw new Error();
        }

        // 順番変更を反映
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;
        Store.dispatch(DocActions.updateAccountOrder(this.state.selectedTab, oldIndex, newIndex));

        // 自動保存リクエスト
        Store.dispatch(UiActions.documentRequestAutoSave());
      },
    });
  }

  public render() {
    const rootClass = ClassNames(PageStyles.Base, LayoutStyles.TopToBottom);
    const header = <Header title={'口座設定'} iconName="payment" />;

    const btnInfos = [
      { label: '資産', onChanged: () => this.onTabChanged(DocTypes.AccountKind.Assets) },
      { label: '負債', onChanged: () => this.onTabChanged(DocTypes.AccountKind.Liabilities) },
      { label: '集計', onChanged: () => this.onTabChanged(DocTypes.AccountKind.Aggregate) },
    ];
    const controlBar = (
      <div className={Styles.ControlBar}>
        <div className={Styles.ControlBarAreaLeft}>
          <RadioButtonGroup btns={btnInfos} selectedBtnIndex={this.state.selectedTab - 1} />
        </div>
        <div className={Styles.ControlBarAreaRight}>
          <button className={BasicStyles.IconBtn} onClick={(e) => this.onAddBtnClicked(e)}>
            <MaterialIcon name={'add'} classNames={[]} darkMode={false} />
          </button>
        </div>
      </div>
    );

    const cards: JSX.Element[] = [];
    {
      const accountsSelector = () => {
        return DocStateMethods.accountOrder(this.props.doc, this.state.selectedTab).map((id) => {
          const account = DocStateMethods.accountById(this.props.doc, id);
          return {
            id: account.id,
            name: account.name,
          };
        });
      };
      const recordCountsDict = this.recordCountsDict();
      accountsSelector().forEach((account) => {
        const recordCountBaadge =
          account.id in recordCountsDict ? (
            <span className={Styles.AccountCardRecordCountBadge}>{recordCountsDict[account.id]}件</span>
          ) : null;
        cards.push(
          <li
            key={`${this.state.selectedTab}-${account.id}`}
            className={Styles.AccountCard}
            data-selected={this.state.cardActionMenuActive && this.state.editAccountId === account.id}
          >
            <MaterialIcon name="reorder" classNames={[Styles.AccountCardHandle]} darkMode={false} />
            <span>{account.name}</span>
            {recordCountBaadge}
            <div className={Styles.AccountCardTailSpace}>
              <button className={BasicStyles.IconBtn} onClick={(e) => this.onCardActionBtnClicked(e, account.id)}>
                <MaterialIcon name="more_horiz" classNames={[]} darkMode={false} />
              </button>
            </div>
          </li>,
        );
      });
    }
    const accountList = (
      <ol id={this.elemIdAccountList} className={Styles.AccountList}>
        {cards}
      </ol>
    );

    const modalDialog = ((): JSX.Element | null => {
      if (!this.state.modalAccountEdit) {
        return null;
      }
      switch (this.state.dialogAccountKind) {
        case DocTypes.AccountKind.Assets:
        case DocTypes.AccountKind.Liabilities:
          return (
            <BasicAccountEditDialog
              accountKind={
                this.state.dialogAccountKind === DocTypes.AccountKind.Assets
                  ? DocTypes.AccountKind.Assets
                  : DocTypes.AccountKind.Liabilities
              }
              editAccountId={this.state.editAccountId}
              onClosed={(isCanceled) => this.onAccountEditDialogClosed(isCanceled)}
            />
          );
        case DocTypes.AccountKind.Aggregate:
          return (
            <AggregateAccountEditDialog
              editAccountId={this.state.editAccountId}
              onClosed={(isCanceled) => this.onAccountEditDialogClosed(isCanceled)}
            />
          );
        default:
          return null;
      }
    })();

    const body = (
      <div className={Styles.BodyRoot}>
        <div className={Styles.Body}>
          {controlBar}
          {accountList}
          {modalDialog}
        </div>
      </div>
    );

    return (
      <div className={rootClass}>
        {header}
        {body}
      </div>
    );
  }

  private onTabChanged(kind: DocTypes.AccountKind) {
    this.setState({
      selectedTab: kind,
    });
  }

  private onAddBtnClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    e.stopPropagation();
    this.addActionMenu.popup();
  }

  private onCardActionBtnClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, id: number): void {
    e.stopPropagation();
    this.setState({ cardActionMenuActive: true, dialogAccountKind: this.state.selectedTab, editAccountId: id });
    this.cardActionMenu.popup({
      callback: () => {
        this.setState({ cardActionMenuActive: false });
      },
    });
  }

  private onAccountEditDialogClosed(isCanceled: boolean): void {
    // タブを更新
    const selectedTabSelector = () => {
      // キャンセル時は変更無し
      if (isCanceled) {
        return this.state.selectedTab;
      }

      // 追加・更新があった場合はその口座のタブを選択
      return this.state.dialogAccountKind;
    };

    // 後始末
    this.setState({
      selectedTab: selectedTabSelector(),
      editAccountId: null,
      modalAccountEdit: false,
    });
  }

  private accountDelete() {
    // 値チェック
    if (this.state.editAccountId === null) {
      throw new Error();
    }

    // 確認

    const recordCountsDict = this.recordCountsDict();
    const recordCount =
      this.state.editAccountId in recordCountsDict ? recordCountsDict[this.state.editAccountId] : null;
    const detailMessage = (() => {
      if (recordCount !== null) {
        return `口座に紐付く ${recordCount} 件のレコードは削除されます。`;
      }
      return undefined;
    })();
    if (
      !NativeDialogUtils.showOkCancelDialog(
        '口座の削除',
        `口座“${DocStateMethods.accountById(this.props.doc, this.state.editAccountId).name}"を削除しますか？`,
        detailMessage,
        '口座を削除',
      )
    ) {
      return;
    }

    // 削除を実行
    Store.dispatch(DocActions.deleteAccount(this.state.editAccountId));
    Store.dispatch(UiActions.recordEditDialogUpdateLatestValue(null, null, null)); // 前回入力値情報をリセット

    // 自動保存
    Store.dispatch(UiActions.documentRequestAutoSave());
  }

  /// 各基本口座が持つレコード数の辞書を返す。
  private recordCountsDict() {
    const recordCountsDict: { [key: number]: number } = {};
    {
      const incRecordCountFunc = (accountId: number) => {
        if (!(accountId in recordCountsDict)) {
          recordCountsDict[accountId] = 0;
        }
        recordCountsDict[accountId]++;
      };
      Object.values(this.props.doc.income.records).forEach((record) => {
        incRecordCountFunc(record.account);
      });
      Object.values(this.props.doc.outgo.records).forEach((record) => {
        incRecordCountFunc(record.account);
      });
      Object.values(this.props.doc.transfer.records).forEach((record) => {
        incRecordCountFunc(record.accountFrom);
        incRecordCountFunc(record.accountTo);
      });
    }
    return recordCountsDict;
  }
}

const mapStateToProps = (state: IStoreState) => {
  return {
    doc: state.doc,
  };
};
export default ReactRedux.connect(mapStateToProps)(Account);
