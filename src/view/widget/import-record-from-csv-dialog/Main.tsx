import 'flatpickr/dist/l10n/ja.js';
import 'src/@types/mdb/modal';

import ClassNames from 'classnames';
import { parse } from 'csv-parse/sync';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as DocActions from 'src/state/doc/Actions';
import * as DocStateMethods from 'src/state/doc/StateMethods';
import * as DocStates from 'src/state/doc/States';
import * as DocTypes from 'src/state/doc/Types';
import { INVALID_ID } from 'src/state/doc/Types';
import IStoreState from 'src/state/IStoreState';
import Store from 'src/state/Store';
import * as UiActions from 'src/state/ui/Actions';
import IYearMonthDayDate from 'src/util/IYearMonthDayDate';
import * as IYearMonthDayDateUtils from 'src/util/IYearMonthDayDateUtils';
import * as PriceUtils from 'src/util/PriceUtils';
import BasicStyles from 'src/view/Basic.css';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';
import { v4 as UUID } from 'uuid';


import Styles from './Main.css';

interface IProps {
  /** 処理する csv テキスト。 */
  csvText: string;

  /** 閉じる際のコールバック。 */
  onClosed: () => void;
}

interface ILocalProps extends IProps {
  doc: DocStates.IState;
}

enum RowKind {
  Invalid,
  Income,
  Outgo,
}

interface IGroupInfo {
  accountId: number | null;
  categoryId: number | null;
}

interface CsvRow {
  kind: RowKind;
  date: IYearMonthDayDate;
  memo: string;
  income: number | null;
  outgo: number | null;
  category: string;
  group: IGroupInfo | null;
}

interface IState {
  csvRows: CsvRow[];
  targetAccountId: number;
  isGroupCellSelected: boolean;
}

class Main extends React.Component<ILocalProps, IState> {
  private elementIdRoot: string;
  private elementIdCloseBtn: string;
  private elementIdImportBtn: string;
  private elementIdGroupPrefix: string;
  private classNameIncomeGroupSelect: string;
  private classNameOutgoGroupSelect: string;

  /** 選択中の GroupCell の html element id。 */
  private selectedGroupCellId: string;

  constructor(props: ILocalProps) {
    super(props);
    this.state = {
      csvRows: [],
      targetAccountId: INVALID_ID,
      isGroupCellSelected: false,
    };
    this.elementIdRoot = `elem-${UUID()}`;
    this.elementIdCloseBtn = `elem-${UUID()}`;
    this.elementIdImportBtn = `elem-${UUID()}`;
    this.elementIdGroupPrefix = `elem-${UUID()}`;
    this.classNameIncomeGroupSelect = `class-${UUID()}`;
    this.classNameOutgoGroupSelect = `class-${UUID()}`;
    this.selectedGroupCellId = '';
  }

  public componentDidMount() {
    // csv 解析
    const csvRows: CsvRow[] = [];
    this.props.csvText.split('\n').forEach((line) => {
      // 0000/00/00 フォーマットから始まる行を対象データとして扱う
      if (!line.match(/\d{4}\/\d{1,2}\/\d{1,2}/)) {
        return;
      }

      // 行解析
      const cols = parse(line, { columns: false })[0] as string[];
      const incomeText = cols[2].replace(',', '');
      const incomeNumber = parseInt(incomeText);
      const income = isNaN(incomeNumber) ? null : incomeNumber;
      const outgoText = cols[3].replace(',', '');
      const outgoNumber = parseInt(outgoText);
      const outgo = isNaN(outgoNumber) ? null : outgoNumber;
      const kindSelector = () => {
        if (income !== null && outgo === null) {
          return RowKind.Income;
        }
        if (income === null && outgo !== null) {
          return RowKind.Outgo;
        }
        return RowKind.Invalid;
      };
      const kind = kindSelector();
      const category = cols[4];
      let group: IGroupInfo | null = null;
      switch (kind) {
        case RowKind.Income: {
          const dict = this.props.doc.importTool.palmCategories.income;
          if (category in dict) {
            const info = dict[category];
            group = {
              accountId: info.account !== INVALID_ID ? info.account : null,
              categoryId: info.category !== INVALID_ID ? info.category : null,
            };
          }
          break;
        }
        case RowKind.Outgo: {
          const dict = this.props.doc.importTool.palmCategories.outgo;
          if (category in dict) {
            const info = dict[category];
            group = {
              accountId: info.account !== INVALID_ID ? info.account : null,
              categoryId: info.category !== INVALID_ID ? info.category : null,
            };
          }
          break;
        }
      }
      csvRows.push({
        kind,
        date: IYearMonthDayDateUtils.fromText(cols[0].replace('/', '-')),
        memo: cols[1],
        income,
        outgo,
        category,
        group,
      });
    });
    this.setState({
      csvRows,
    });

    // ContextMenu セットアップ
    const groupSetup = (
      accountLabel: string,
      rootCategory: number,
      categories: { [key: number]: DocStates.ICategory },
      onAccountSelected: (rowIdx: number, accountId: number) => void,
      onCategorySelected: (rowIdx: number, categoryId: number) => void,
      selector: string,
    ) => {
      const prefixAccount = 'account';
      const prefixCategory = 'category';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupItems: { [key: string]: any } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountItems: { [key: string]: any } = {};
      const basicAccounts = DocStateMethods.basicAccounts(this.props.doc);
      DocStateMethods.basicAccountOrderMixed(this.props.doc).forEach((accountId) => {
        const key = `account-${accountId}`;
        const name = basicAccounts[accountId].name;
        accountItems[key] = {
          name,
          items: null,
        };
      });
      groupItems[INVALID_ID] = {
        name: accountLabel,
        items: accountItems,
      };
      groupItems['separator'] = '------------';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoryConvertFunc = (parent: { [key: string]: any }, cat: DocStates.ICategory) => {
        const key = `category-${cat.id}`;
        const name = cat.name;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: { [key: string]: any } = {};
        cat.childs.forEach((child) => {
          categoryConvertFunc(items, categories[child]);
        });
        parent[key] = {
          name,
          items: Object.keys(items).length === 0 ? null : items,
        };
      };
      categories[rootCategory].childs.forEach((id) => {
        categoryConvertFunc(groupItems, categories[id]);
      });

      $.contextMenu({
        callback: (key, options) => {
          const rowIdx = Number(options.$trigger.attr('data-row-idx'));
          const texts = key.split('-');
          const selectedId = Number(texts[1]);
          switch (texts[0]) {
            case prefixAccount:
              onAccountSelected(rowIdx, selectedId);
              break;
            case prefixCategory:
              onCategorySelected(rowIdx, selectedId);
              break;
          }
        },
        determinePosition: (menu) => {
          const parent = $(`#${this.selectedGroupCellId}`);
          const base = parent.offset();
          const height = parent.height();
          if (base !== undefined && height !== undefined) {
            menu.offset({ top: base.top + height + 2, left: base.left - 20 });
          }
        },
        events: {
          hide: (opts) => {
            this.setState({
              isGroupCellSelected: false,
            });
            return true;
          },
        },
        className: Styles.ContextMenuRoot,
        items: groupItems,
        selector,
        trigger: 'none',
      });
    };
    const targetRowIdxs = (rowIdx: number): number[] => {
      const rows = this.state.csvRows
        .map((row, idx) => idx)
        .filter(
          (idx) =>
            this.state.csvRows[idx].kind !== RowKind.Invalid &&
            this.state.csvRows[idx].category === this.state.csvRows[rowIdx].category,
        );
      if (
        1 < rows.length &&
        NativeDialogUtils.showYesNoCancelDialog(
          'レコードの取込',
          '同じPalmカテゴリの他レコードも変更しますか？',
          `「すべて変更」を選んだ場合，Palmカテゴリ"${this.state.csvRows[rowIdx].category}"のレコード${rows.length}件の分類をすべて変更します。`,
          'すべて変更',
          '選択したレコードのみ変更',
        ) === NativeDialogUtils.YesNoCacnelDialogResult.Yes
      ) {
        return rows;
      }
      return [rowIdx];
    };
    const onAccountSelected = (rowIdx: number, accountId: number): void => {
      // 取込先と同じ口座は選択不可
      if (accountId === this.state.targetAccountId) {
        return;
      }
      const newArray = this.state.csvRows.concat([]);
      const rowIdxs = targetRowIdxs(rowIdx);
      rowIdxs.forEach((idx) => {
        newArray[idx].group = {
          accountId,
          categoryId: null,
        };
      });
      this.setState({
        csvRows: newArray,
      });
    };
    const onCategorySelected = (rowIdx: number, categoryId: number): void => {
      const newArray = this.state.csvRows.concat([]);
      const rowIdxs = targetRowIdxs(rowIdx);
      rowIdxs.forEach((idx) => {
        newArray[idx].group = {
          accountId: null,
          categoryId,
        };
      });
      this.setState({
        csvRows: newArray,
      });
    };
    groupSetup(
      '送金元口座',
      this.props.doc.income.rootCategoryId,
      this.props.doc.income.categories,
      onAccountSelected,
      onCategorySelected,
      `.${this.classNameIncomeGroupSelect}`,
    );
    groupSetup(
      '送金先口座',
      this.props.doc.outgo.rootCategoryId,
      this.props.doc.outgo.categories,
      onAccountSelected,
      onCategorySelected,
      `.${this.classNameOutgoGroupSelect}`,
    );

    // ダイアログ表示
    $(`#${this.elementIdRoot}`).modal({ show: true, backdrop: false });

    // ダイアログ閉じたらコールバック
    $(`#${this.elementIdRoot}`).on('hidden.bs.modal', () => {
      this.props.onClosed();
    });
  }

  public render() {
    // メモ
    const basicAccounts = DocStateMethods.basicAccounts(this.props.doc);

    // ヘッダ
    const dialogHeaderClass = ClassNames('modal-header', Styles.DialogHeader);
    const header = (
      <div className={dialogHeaderClass}>
        <h5 className="modal-title" id="exampleModalLabel">
          レコードの取込
        </h5>
        <button type="button" id={this.elementIdCloseBtn} className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    );

    // 取込先口座
    const targetAccountSelectClass = ClassNames(BasicStyles.StdSelect);
    const targetAccountOptions = [INVALID_ID]
      .concat(DocStateMethods.basicAccountOrderMixed(this.props.doc))
      .map((id) => {
        const name = id === INVALID_ID ? '（未選択）' : basicAccounts[id].name;
        return (
          <option key={id} value={id}>
            {name}
          </option>
        );
      });
    const targetAccount = (
      <div className={Styles.TargetAccountRoot}>
        <span>取込先口座:</span>
        <select
          className={targetAccountSelectClass}
          defaultValue={INVALID_ID}
          onChange={(e) => {
            this.onTargetAccountChanged(e);
          }}
        >
          {targetAccountOptions}
        </select>
      </div>
    );

    // テーブル
    const tableHeader = (
      <table className={Styles.TableHeader}>
        <tbody>
          <tr>
            <td data-header={true} data-col-category={'date'}>
              日付
            </td>
            <td data-header={true} data-col-category={'memo'}>
              メモ
            </td>
            <td data-header={true} data-col-category={'income'}>
              入金
            </td>
            <td data-header={true} data-col-category={'outgo'}>
              出金
            </td>
            <td data-header={true} data-col-category={'palm-category'}>
              Palmカテゴリ
            </td>
            <td data-header={true} data-col-category={'group'}>
              分類
            </td>
            <td data-header={true} data-col-category={'tail-space'}></td>
          </tr>
        </tbody>
      </table>
    );
    const tableBodyRows = this.state.csvRows.map((row, idx) => {
      const isIncome = row.kind === RowKind.Income;
      const isOutgo = row.kind === RowKind.Outgo;
      const groupClass = ClassNames(
        isIncome ? this.classNameIncomeGroupSelect : '',
        isOutgo ? this.classNameOutgoGroupSelect : '',
      );
      const groupCellId = `${this.elementIdGroupPrefix}${idx}`;
      const isClickable = row.kind !== RowKind.Invalid;
      const isGroupSelected = this.state.isGroupCellSelected && this.selectedGroupCellId === groupCellId;
      const labelAndRecordKindSelector = (): { label: string; recordKind: DocTypes.RecordKind } => {
        if (row.kind === RowKind.Invalid) {
          const label =
            row.income === null
              ? '取込をスキップ（入金・出金が空欄です）'
              : '取込をスキップ（入金・出金それぞれに数値があります）';
          return {
            label,
            recordKind: DocTypes.RecordKind.Invalid,
          };
        }
        if (row.group === null) {
          return {
            label: '（未選択）',
            recordKind: DocTypes.RecordKind.Invalid,
          };
        }
        if (row.group.accountId !== null) {
          return {
            label: basicAccounts[row.group.accountId].name,
            recordKind: DocTypes.RecordKind.Transfer,
          };
        }
        if (row.group.categoryId !== null) {
          if (isIncome) {
            return {
              label: DocStateMethods.categoryIncomeFullPathDisplayText(this.props.doc, row.group.categoryId),
              recordKind: DocTypes.RecordKind.Income,
            };
          } else {
            return {
              label: DocStateMethods.categoryOutgoFullPathDisplayText(this.props.doc, row.group.categoryId),
              recordKind: DocTypes.RecordKind.Outgo,
            };
          }
        }
        return {
          label: '',
          recordKind: DocTypes.RecordKind.Invalid,
        };
      };
      const labelAndRecordKind = labelAndRecordKindSelector();
      let iconPath: string | null = null;
      switch (labelAndRecordKind.recordKind) {
        case DocTypes.RecordKind.Income:
          iconPath = './image/icon-ex/income-outline.svg';
          break;
        case DocTypes.RecordKind.Outgo:
          iconPath = './image/icon-ex/outgo-outline.svg';
          break;
        case DocTypes.RecordKind.Transfer:
          iconPath = './image/icon-ex/transfer-outline.svg';
          break;
      }
      const elemIconImg = iconPath === null ? null : <img className={Styles.TableGroupIcon} src={iconPath}></img>;
      const elemLabel = <span className={Styles.TableGroupLabel}>{labelAndRecordKind.label}</span>;
      const elemExpander = isClickable ? <span className={Styles.TableGroupSelectIcon}>▼</span> : null;

      return (
        <tr key={idx}>
          <td data-col-category={'date'}>{IYearMonthDayDateUtils.toDisplayFormatText(row.date)}</td>
          <td data-col-category={'memo'}>{row.memo}</td>
          <td data-col-category={'income'}>{row.income != null ? PriceUtils.numToLocaleString(row.income) : ''}</td>
          <td data-col-category={'outgo'}>{row.outgo != null ? PriceUtils.numToLocaleString(row.outgo) : ''}</td>
          <td data-col-category={'palm-category'}>{row.category}</td>
          <td
            id={groupCellId}
            data-col-category={'group'}
            data-row-idx={idx}
            data-selected={isGroupSelected}
            data-clickable={isClickable}
            className={groupClass}
            onClick={(e) => {
              if (isClickable) {
                this.onGroupCellClicked(e.currentTarget);
              }
            }}
          >
            {elemIconImg}
            {elemLabel}
            {elemExpander}
          </td>
        </tr>
      );
    });
    const tableBody = (
      <div className={Styles.TableBody}>
        <table>
          <tbody>{tableBodyRows}</tbody>
        </table>
      </div>
    );
    const tableRoot = (
      <div className={Styles.TableRoot}>
        {tableHeader}
        {tableBody}
      </div>
    );

    // フッタ
    const importBtnClass = ClassNames(BasicStyles.StdBtnSecondary);
    const footer = (
      <div className={Styles.FooterRoot}>
        <button
          id={this.elementIdImportBtn}
          className={importBtnClass}
          disabled={
            this.state.targetAccountId === INVALID_ID ||
            this.state.csvRows.filter((row) => row.group !== null).length === 0
          }
          onClick={(e) => this.onImportBtnClicked(e)}
        >
          取込
        </button>
      </div>
    );

    // 全体
    const rootClass = ClassNames('modal', 'fade', BasicStyles.DialogBackdrop);
    const dialogRootClass = ClassNames('modal-dialog', 'modal-dialog-centered', Styles.DialogRoot);
    const dialogContentClass = ClassNames('modal-content', Styles.DialogContent);
    return (
      <div
        id={this.elementIdRoot}
        className={rootClass}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalLabel"
        aria-hidden="true"
        data-keyboard="false"
        onKeyDown={(e) => {
          this.onRootKeyDown(e);
        }}
      >
        <div className={dialogRootClass} role="document">
          <div className={dialogContentClass}>
            {header}
            <div className={Styles.BodyAndFooter}>
              {targetAccount}
              {tableRoot}
              {footer}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /// ダイアログ全体のホットキー対応。
  private onRootKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // ESC でダイアログを閉じる。
    if (e.keyCode === 27) {
      e.stopPropagation();
      $(`#${this.elementIdRoot}`).modal('hide');
      return;
    }
    // Command + Enter で追加ボタンを押下
    if (e.keyCode === 13 && e.metaKey) {
      e.stopPropagation();
      $(`#${this.elementIdImportBtn}`).click();
      return;
    }
  }

  /// 取込先口座変更イベント。
  private onTargetAccountChanged(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();

    // 新しい口座とかぶる分類設定は解除しつつ反映
    const targetAccountId = Number(e.target.value);
    const csvRows = this.state.csvRows.concat([]);
    csvRows.forEach((row) => {
      if (row.group !== null && row.group.accountId === targetAccountId) {
        row.group = null;
      }
    });
    this.setState({
      targetAccountId,
      csvRows,
    });
  }

  /// 分類がクリックされたときの処理。
  private onGroupCellClicked(sender: EventTarget & HTMLTableDataCellElement) {
    this.selectedGroupCellId = sender.id; // contextMenu() がすぐにアクセスするためこちらは State ではなくメンバ変数
    this.setState({
      isGroupCellSelected: true, // こちらは render() に関わる変数なので State 変数
    });
    $(`#${sender.id}`).contextMenu();
  }

  /// 取込ボタンが押されたときの処理。
  private onImportBtnClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    e.stopPropagation();

    // 未入力チェック
    const notSelectedCount = this.state.csvRows.filter(
      (row) => row.kind !== RowKind.Invalid && row.group === null,
    ).length;
    if (0 < notSelectedCount) {
      if (
        !NativeDialogUtils.showOkCancelDialog(
          'レコードの取込',
          '分類が未選択のレコードを無視して取り込みますか？',
          `分類が未選択のレコードは${notSelectedCount}件あります。`,
          '取り込む',
        )
      ) {
        return;
      }
    }

    // 取込
    const createDate = new Date();
    this.state.csvRows.forEach((row, rowIdx) => {
      if (row.group === null) {
        return;
      }
      if (row.group.accountId !== null) {
        // 振替
        const amount = row.kind === RowKind.Income ? row.income : row.outgo;
        if (amount === null) {
          throw new Error(`Amount is null. (Row idx: ${rowIdx})`);
        }
        Store.dispatch(
          DocActions.addRecordTransfer(
            createDate,
            row.date,
            row.memo,
            row.kind === RowKind.Income ? row.group.accountId : this.state.targetAccountId, // from
            row.kind === RowKind.Income ? this.state.targetAccountId : row.group.accountId, // to
            amount,
          ),
        );
        return;
      }
      if (row.group.categoryId !== null) {
        if (row.kind === RowKind.Income) {
          // 入金
          const amount = row.income;
          if (amount === null) {
            throw new Error(`Amount is null. (Row idx: ${rowIdx})`);
          }
          Store.dispatch(
            DocActions.addRecordIncome(
              createDate,
              row.date,
              row.memo,
              this.state.targetAccountId,
              row.group.categoryId,
              amount,
            ),
          );
        } else {
          // 出金
          const amount = row.outgo;
          if (amount === null) {
            throw new Error(`Amount is null. (Row idx: ${rowIdx})`);
          }
          Store.dispatch(
            DocActions.addRecordOutgo(
              createDate,
              row.date,
              row.memo,
              this.state.targetAccountId,
              row.group.categoryId,
              amount,
            ),
          );
        }
      }
    });

    // Palm カテゴリ情報の保存
    const uniqRows = this.state.csvRows.filter(
      // 重複要素の中でも最初の１つ目だけ抽出することでユニークな配列を生成
      (row, idx) =>
        this.state.csvRows.findIndex((elem) => elem.kind === row.kind && elem.category === row.category) === idx,
    );
    uniqRows.forEach((row) => {
      // カテゴリ名が未指定のものは保存しない
      if (row.category.length === 0) {
        return;
      }

      // 同じタイプの行を抽出
      const sameRows = this.state.csvRows.filter((elem) => row.kind === elem.kind && row.category === elem.category);

      // グループ設定が１つでも未選択のものがあればグループ設定不統一として扱うため保存しない
      if (0 < sameRows.length && sameRows.filter((elem) => elem.group !== null).length !== sameRows.length) {
        return;
      }

      // グループ設定が１つでも異なるものがあれば保存しない
      if (
        sameRows.filter(
          (elem) => elem.group?.accountId === row.group?.accountId && elem.group?.categoryId === row.group?.categoryId,
        ).length !== sameRows.length
      ) {
        return;
      }

      // 保存
      if (row.group === null) {
        throw new Error();
      }
      const name = row.category;
      const accountId = row.group.accountId !== null ? row.group.accountId : INVALID_ID;
      const categoryId = row.group.categoryId !== null ? row.group.categoryId : INVALID_ID;
      if (row.kind === RowKind.Income) {
        Store.dispatch(DocActions.addPalmCategoryInfoIncome(name, accountId, categoryId));
      } else {
        Store.dispatch(DocActions.addPalmCategoryInfoOutgo(name, accountId, categoryId));
      }
    });

    // 変更があったら自動保存リクエスト
    if (0 < this.state.csvRows.filter((row) => row.group !== null).length) {
      Store.dispatch(UiActions.documentRequestAutoSave());
    }

    // ダイアログ閉じる
    $(`#${this.elementIdRoot}`).modal('hide');
  }
}

const mapStateToProps = (state: IStoreState, props: IProps) => {
  const result: ILocalProps = Object.assign({}, props, {
    doc: state.doc,
  });
  return result;
};
export default ReactRedux.connect(mapStateToProps)(Main);
