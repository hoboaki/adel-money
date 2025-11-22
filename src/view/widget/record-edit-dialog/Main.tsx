import 'flatpickr/dist/l10n/ja.js';
import 'src/@types/mdb/modal';

import ClassNames from 'classnames';
import * as remote from '@electron/remote';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import Split from 'split.js';
import * as DocActions from 'src/state/doc/Actions';
import * as DocStateMethods from 'src/state/doc/StateMethods';
import * as DocStates from 'src/state/doc/States';
import * as DocTypes from 'src/state/doc/Types';
import IStoreState from 'src/state/IStoreState';
import Store from 'src/state/Store';
import * as UiActions from 'src/state/ui/Actions';
import * as UiStates from 'src/state/ui/States';
import IRecordKey from 'src/util/doc/IRecordKey';
import RecordCollection from 'src/util/doc/RecordCollection';
import * as RecordFilters from 'src/util/doc/RecordFilters';
import RecordOrderKind from 'src/util/doc/RecordOrderKind';
import IYearMonthDayDate from 'src/util/IYearMonthDayDate';
import * as IYearMonthDayDateUtils from 'src/util/IYearMonthDayDateUtils';
import * as PriceUtils from 'src/util/PriceUtils';
import BasicStyles from 'src/view/Basic.css';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';
import RadioButtonGroup from 'src/view/widget/radio-button-group';
import MaterialIcon from 'src/view/widget/material-icon';
import { v4 as UUID } from 'uuid';

import Styles from './Main.css';

/** 新規レコードを示す ID。 */
const NEW_RECORD_ID = DocTypes.INVALID_ID;

interface IProps {
  /** 入力フォームの新規レコード初期値。null の場合は前回入力値を使用。 */
  formDefaultValue: {
    recordKind: DocTypes.RecordKind;
    date: IYearMonthDayDate;
    accountId: number | null;
    categoryId: number | null;
  };

  /** 一覧に追加表示するレコード群。 */
  additionalRecords: IRecordKey[];

  /** 閉じる際のコールバック。 */
  onClosed: () => void;
}

interface ILocalProps extends IProps {
  doc: DocStates.IState;
  dialogRecordAdd: UiStates.IDialogAddRecord;
}

interface IState {
  formKind: DocTypes.RecordKind;
  formDate: string;
  formCategoryOutgo: number;
  formCategoryIncome: number;
  formAccount: number;
  formAccountFrom: number;
  formAccountTo: number;
  formAmount: number;
  formAmountIsNegative: boolean;
  formAmountTransfer: number;
  formMemo: string;
  submitSuccessMsg: string;
  amountErrorMsg: string | null;
  amountTransferErrorMsg: string | null;
  accountFromErrorMsg: string | null;
  accountToErrorMsg: string | null;

  /** 選択中のレコードのID。NEW_RECORD_ID なら新規レコード。null なら何も選択していない状態。 */
  selectedRecordId: number | null;
}

class Main extends React.Component<ILocalProps, IState> {
  private elementIdRoot: string;
  private elementIdCloseBtn: string;
  private elementIdSectionLeftSide: string;
  private elementIdAddRecord: string;
  private elementIdSectionRightSide: string;
  private elementIdFormCategoryOutgo: string;
  private elementIdFormCategoryIncome: string;
  private elementIdFormDate: string;
  private elementIdFormAccount: string;
  private elementIdFormAccountFrom: string;
  private elementIdFormAccountTo: string;
  private elementIdFormAmount: string;
  private elementIdFormAmountTransfer: string;
  private elementIdFormMemo: string;
  private elementIdFormSubmit: string;
  private additionalRecordKeys: IRecordKey[];
  private viewRecordIdMin: number;

  constructor(props: ILocalProps) {
    super(props);
    const formDefaultValue = this.props.formDefaultValue;
    const formCategoryOutgo =
      formDefaultValue.recordKind === DocTypes.RecordKind.Outgo && formDefaultValue.categoryId !== null
        ? formDefaultValue.categoryId
        : this.props.dialogRecordAdd.latestFormCategoryOutgo !== DocTypes.INVALID_ID
          ? this.props.dialogRecordAdd.latestFormCategoryOutgo
          : DocStateMethods.firstLeafCategoryId(this.props.doc.outgo.rootCategoryId, this.props.doc.outgo.categories);
    const formCategoryIncome =
      formDefaultValue.recordKind === DocTypes.RecordKind.Income && formDefaultValue.categoryId !== null
        ? formDefaultValue.categoryId
        : this.props.dialogRecordAdd.latestFormCategoryIncome !== DocTypes.INVALID_ID
          ? this.props.dialogRecordAdd.latestFormCategoryIncome
          : DocStateMethods.firstLeafCategoryId(this.props.doc.income.rootCategoryId, this.props.doc.income.categories);
    const formAccount =
      formDefaultValue.accountId !== null
        ? formDefaultValue.accountId
        : this.props.dialogRecordAdd.latestFormAccount !== DocTypes.INVALID_ID
          ? this.props.dialogRecordAdd.latestFormAccount
          : DocStateMethods.basicAccountOrderMixed(this.props.doc)[0];
    this.state = {
      formKind: formDefaultValue.recordKind,
      formDate: IYearMonthDayDateUtils.toDisplayFormatText(formDefaultValue.date),
      formCategoryOutgo,
      formCategoryIncome,
      formAccount,
      formAccountFrom: DocTypes.INVALID_ID,
      formAccountTo: DocTypes.INVALID_ID,
      submitSuccessMsg: '',
      formAmount: 0,
      formAmountIsNegative: false,
      formAmountTransfer: 0,
      formMemo: '',
      amountErrorMsg: null,
      amountTransferErrorMsg: null,
      accountFromErrorMsg: null,
      accountToErrorMsg: null,
      selectedRecordId: NEW_RECORD_ID,
    };
    this.elementIdRoot = `elem-${UUID()}`;
    this.elementIdCloseBtn = `elem-${UUID()}`;
    this.elementIdSectionLeftSide = `elem-${UUID()}`;
    this.elementIdSectionRightSide = `elem-${UUID()}`;
    this.elementIdFormCategoryOutgo = `elem-${UUID()}`;
    this.elementIdFormCategoryIncome = `elem-${UUID()}`;
    this.elementIdFormDate = `elem-${UUID()}`;
    this.elementIdFormAccount = `elem-${UUID()}`;
    this.elementIdFormAccountFrom = `elem-${UUID()}`;
    this.elementIdFormAccountTo = `elem-${UUID()}`;
    this.elementIdFormAmount = `elem-${UUID()}`;
    this.elementIdFormAmountTransfer = `elem-${UUID()}`;
    this.elementIdFormMemo = `elem-${UUID()}`;
    this.elementIdFormSubmit = `elem-${UUID()}`;
    this.elementIdAddRecord = `elem-${UUID()}`;
    this.additionalRecordKeys = this.props.additionalRecords;
    this.viewRecordIdMin = this.props.doc.nextId.record;
  }

  public componentDidMount() {
    // DatePicker セットアップ
    $(`#${this.elementIdFormDate}`)
      .datepicker({
        format: 'yyyy/mm/dd',
        todayBtn: 'linked',
        language: 'ja',
        autoclose: true,
        todayHighlight: true,
        showOnFocus: false,
      })
      .on('changeDate', (e) => {
        this.onFormDateChanged(e.format('yyyy/mm/dd'));
      });

    // ContextMenu セットアップ
    const categorySetup = (
      categoryRootOrder: number[],
      categories: { [key: number]: DocStates.ICategory },
      onCategorySelected: (categoryId: number) => void,
      selector: string,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoryItems: { [key: string]: any } = {};
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
      categoryRootOrder.forEach((id) => {
        categoryConvertFunc(categoryItems, categories[id]);
      });
      $.contextMenu({
        callback: (key, options) => {
          const texts = key.split('-');
          onCategorySelected(Number(texts[1]));
        },
        determinePosition: (menu) => {
          const parent = $(selector);
          const base = parent.offset();
          const height = parent.height();
          if (base !== undefined && height !== undefined) {
            menu.offset({ top: base.top + height, left: base.left - 20 });
          }
        },
        className: Styles.ContextMenuRoot,
        items: categoryItems,
        selector,
        trigger: 'none',
      });
    };
    categorySetup(
      this.props.doc.outgo.categories[this.props.doc.outgo.rootCategoryId].childs,
      this.props.doc.outgo.categories,
      (categoryId) => {
        this.setState({
          formCategoryOutgo: categoryId,
        });
      },
      `#${this.elementIdFormCategoryOutgo}`,
    );
    categorySetup(
      this.props.doc.income.categories[this.props.doc.income.rootCategoryId].childs,
      this.props.doc.income.categories,
      (categoryId) => {
        this.setState({
          formCategoryIncome: categoryId,
        });
      },
      `#${this.elementIdFormCategoryIncome}`,
    );

    // ツールチップ対応
    new Function(`$('#${this.elementIdFormSubmit}').tooltip({
      title: '⌘Cmd + ⏎', delay: {show: 500, hide: 100}, placement:'bottom'
    })`)();

    // ダイアログ表示
    $(`#${this.elementIdRoot}`).modal({ show: true, backdrop: false });

    // ダイアログ表示したら日付にフォーカス
    $(`#${this.elementIdRoot}`).on('shown.bs.modal', () => {
      $(`#${this.elementIdFormDate}`).focus();
    });

    // ダイアログ閉じたらコールバック
    $(`#${this.elementIdRoot}`).on('hidden.bs.modal', () => {
      this.props.onClosed();
    });

    // スピリッター登録
    Split([`#${this.elementIdSectionLeftSide}`, `#${this.elementIdSectionRightSide}`], {
      sizes: [50, 50],
      gutterSize: 12,
      cursor: 'col-resize',
      direction: 'horizontal',
    });

    // 左側最下部スクロール
    const sectionLeftSideElem = document.getElementById(this.elementIdSectionLeftSide);
    if (sectionLeftSideElem != null) {
      sectionLeftSideElem.scrollTop = sectionLeftSideElem.scrollHeight;
    }
  }

  public render() {
    // 全体およびヘッダ関連
    const rootClass = ClassNames('modal', 'fade', BasicStyles.DialogBackdrop);
    const dialogRootClass = ClassNames('modal-dialog', 'modal-dialog-centered', Styles.DialogRoot);
    const dialogContentClass = ClassNames('modal-content', Styles.DialogContent);
    const dialogHeaderClass = ClassNames('modal-header', Styles.DialogHeader);

    // 左側関連
    const records = this.listRecords();
    const recordElems: JSX.Element[] = [];
    const basicAccounts = DocStateMethods.basicAccounts(this.props.doc);
    records.forEach((recordKey) => {
      const selected = recordKey.id === this.state.selectedRecordId;
      let date = IYearMonthDayDateUtils.today();
      let svgIconName = '';
      let amount = 0;
      let memo = '0:';
      let additionalElems: JSX.Element[] = [];
      switch (recordKey.kind) {
        case DocTypes.RecordKind.Income: {
          const record = this.props.doc.income.records[recordKey.id];
          date = record.date;
          svgIconName = 'income';
          amount = record.amount;
          memo = record.memo;
          additionalElems = [
            <MaterialIcon
              key={`${record.id}-0`}
              name={'class'}
              classNames={[Styles.ListCardTopIcon]}
              darkMode={true}
            />,
            <span key={`${record.id}-1`}>{this.props.doc.income.categories[record.category].name}</span>,
            <MaterialIcon
              key={`${record.id}-2`}
              name={'payment'}
              classNames={[Styles.ListCardTopIcon]}
              darkMode={true}
            />,
            <span key={`${record.id}-3`}>{basicAccounts[record.account].name}</span>,
          ];
          break;
        }

        case DocTypes.RecordKind.Outgo: {
          const record = this.props.doc.outgo.records[recordKey.id];
          date = record.date;
          svgIconName = 'outgo';
          amount = record.amount;
          memo = record.memo;
          additionalElems = [
            <MaterialIcon
              key={`${record.id}-0`}
              name={'class'}
              classNames={[Styles.ListCardTopIcon]}
              darkMode={true}
            />,
            <span key={`${record.id}-1`}>{this.props.doc.outgo.categories[record.category].name}</span>,
            <MaterialIcon
              key={`${record.id}-2`}
              name={'payment'}
              classNames={[Styles.ListCardTopIcon]}
              darkMode={true}
            />,
            <span key={`${record.id}-3`}>{basicAccounts[record.account].name}</span>,
          ];
          break;
        }

        case DocTypes.RecordKind.Transfer: {
          const record = this.props.doc.transfer.records[recordKey.id];
          date = record.date;
          svgIconName = 'transfer';
          amount = record.amount;
          memo = record.memo;
          additionalElems = [
            <MaterialIcon
              key={`${record.id}-0`}
              name={'payment'}
              classNames={[Styles.ListCardTopIcon]}
              darkMode={true}
            />,
            <span key={`${record.id}-1`}>{basicAccounts[record.accountFrom].name}</span>,
            <MaterialIcon
              key={`${record.id}-2`}
              name={'forward'}
              classNames={[Styles.ListCardForwardIcon]}
              darkMode={true}
            />,
            <MaterialIcon
              key={`${record.id}-3`}
              name={'payment'}
              classNames={[Styles.ListCardTopIcon]}
              darkMode={true}
            />,
            <span key={`${record.id}-4`}>{basicAccounts[record.accountTo].name}</span>,
          ];
          break;
        }
      }
      recordElems.push(
        <div
          key={recordKey.id}
          className={Styles.ListCard}
          onClick={(e) => this.onListCardClicked(e, recordKey.id, recordKey.kind)}
          data-selected={selected}
        >
          <img className={Styles.ListCardSvgIcon} src={`./image/icon-ex/${svgIconName}-outline.svg`} />
          <div className={Styles.ListCardBody}>
            <div className={Styles.ListCardTop} data-selected={selected}>
              <span className={Styles.ListCardDate}>{IYearMonthDayDateUtils.toDisplayFormatText(date)}</span>
              {additionalElems}
            </div>
            <div className={Styles.ListCardBottom}>
              <span className={Styles.ListCardMemo} data-selected={selected}>
                {memo}
              </span>
            </div>
          </div>
          <div className={Styles.ListCardAmountHolder}>
            <span className={Styles.ListCardAmount} data-selected={selected}>
              ¥{PriceUtils.numToLocaleString(amount)}
            </span>
          </div>
        </div>,
      );
    });
    {
      // 新規レコード
      const selected = this.state.selectedRecordId === NEW_RECORD_ID;
      recordElems.push(
        <div
          key={this.elementIdAddRecord}
          className={Styles.ListCard}
          onClick={(e) => this.onListCardClicked(e, NEW_RECORD_ID, DocTypes.RecordKind.Invalid)}
          data-record-id={NEW_RECORD_ID}
          data-selected={selected}
          data-is-new-record={true}
        >
          <div className={Styles.ListCardAddRecord}>新規レコード</div>
        </div>,
      );
    }

    const sectionLeftSide = (
      <section
        id={this.elementIdSectionLeftSide}
        className={Styles.SectionLeftSideRoot}
        onClick={(e) => {
          this.onListBackgroundClicked(e);
        }}
      >
        {recordElems}
      </section>
    );

    // 右側関連
    const isUpdateMode = this.state.selectedRecordId !== null && this.state.selectedRecordId !== NEW_RECORD_ID;
    const formTabsRootClass = ClassNames(Styles.FormTabsRoot);
    const formTabsBaseClass = ClassNames(Styles.FormTabsBase);
    const formTabBorder = ClassNames(Styles.FormTabBorder);
    const formTabBorderHiddenTransfer = isUpdateMode && this.state.formKind !== DocTypes.RecordKind.Transfer;
    const formTabBorderHiddenTransferAndIncome = isUpdateMode && this.state.formKind === DocTypes.RecordKind.Outgo;
    const formTabBorderHiddenIncomeAndOutgo = isUpdateMode && this.state.formKind === DocTypes.RecordKind.Transfer;
    const formTabBorderHiddenOutgo = isUpdateMode && this.state.formKind !== DocTypes.RecordKind.Outgo;
    const formTabOutgoClass = ClassNames(
      Styles.FormTab,
      this.state.formKind === DocTypes.RecordKind.Outgo ? Styles.FormTabActive : null,
      isUpdateMode && this.state.formKind !== DocTypes.RecordKind.Outgo ? Styles.FormTabHidden : null,
    );
    const formTabIncomeClass = ClassNames(
      Styles.FormTab,
      this.state.formKind === DocTypes.RecordKind.Income ? Styles.FormTabActive : null,
      isUpdateMode && this.state.formKind !== DocTypes.RecordKind.Income ? Styles.FormTabHidden : null,
    );
    const formTabTransferClass = ClassNames(
      Styles.FormTab,
      this.state.formKind === DocTypes.RecordKind.Transfer ? Styles.FormTabActive : null,
      isUpdateMode && this.state.formKind !== DocTypes.RecordKind.Transfer ? Styles.FormTabHidden : null,
    );
    const formSvgIconClass = ClassNames(Styles.FormSvgIcon);

    const formInputRootClass = ClassNames(Styles.FormInputRoot);
    const formInputRowCategoryOutgoClass = ClassNames(
      this.state.formKind === DocTypes.RecordKind.Outgo ? null : Styles.FormInputRowHide,
    );
    const formInputRowCategoryIncomeClass = ClassNames(
      this.state.formKind === DocTypes.RecordKind.Income ? null : Styles.FormInputRowHide,
    );
    const formInputRowAcountClass = ClassNames(
      this.state.formKind !== DocTypes.RecordKind.Transfer ? null : Styles.FormInputRowHide,
    );
    const formInputRowAcountFromToClass = ClassNames(
      this.state.formKind === DocTypes.RecordKind.Transfer ? null : Styles.FormInputRowHide,
    );
    const formInputRowAmountClass = ClassNames(
      this.state.formKind !== DocTypes.RecordKind.Transfer ? null : Styles.FormInputRowHide,
      !this.state.formAmountIsNegative
        ? null
        : this.state.formKind === DocTypes.RecordKind.Outgo
          ? Styles.FormInputAmountCellNegativeOutgo
          : Styles.FormInputAmountCellNegativeIncome,
    );
    const formInputRowAmountTransferClass = ClassNames(
      this.state.formKind === DocTypes.RecordKind.Transfer ? null : Styles.FormInputRowHide,
    );
    const formInputCategoryClass = ClassNames(Styles.FormInputCategory);
    const formInputAccountSelectClass = ClassNames(Styles.FormInputAccount);

    const formFooterRootClass = ClassNames('modal-footer', Styles.FormFooterRoot);
    const formDeleteBtnClass = ClassNames(BasicStyles.StdBtnPrimary, Styles.FormDeleteBtn);
    const formSubmitBtnClass = ClassNames(BasicStyles.StdBtnSecondary, Styles.FormSubmitBtn);

    const accountFromErrorMsg =
      this.state.accountFromErrorMsg == null ? null : (
        <span className={Styles.FormErrorMsg}>{this.state.accountFromErrorMsg}</span>
      );
    const accountToErrorMsg =
      this.state.accountToErrorMsg == null ? null : (
        <span className={Styles.FormErrorMsg}>{this.state.accountToErrorMsg}</span>
      );
    const amountErrorMsg =
      this.state.amountErrorMsg == null ? null : (
        <span className={Styles.FormErrorMsg}>{this.state.amountErrorMsg}</span>
      );
    const amountTransferErrorMsg =
      this.state.amountTransferErrorMsg == null ? null : (
        <span className={Styles.FormErrorMsg}>{this.state.amountTransferErrorMsg}</span>
      );
    const submitSuccessNotice = <span className={Styles.FormNoticeMsg}>{this.state.submitSuccessMsg}</span>;

    const formTabs = (
      <div className={formTabsRootClass}>
        <div className={formTabsBaseClass}>
          <div className={Styles.FormTabSideSpace} />
          <div className={formTabBorder} data-hidden={formTabBorderHiddenTransfer} />
          <div className={formTabTransferClass} data-update-mode={isUpdateMode}>
            <button
              className={Styles.FormTabButton}
              disabled={this.state.formKind === DocTypes.RecordKind.Transfer}
              onClick={() => {
                this.onFormKindTabCicked(DocTypes.RecordKind.Transfer);
              }}
            >
              <img className={formSvgIconClass} src="./image/icon-ex/transfer-outline.svg" />
              <span className={Styles.FormTabLabel}>振替</span>
            </button>
          </div>
          <div className={formTabBorder} data-hidden={formTabBorderHiddenTransferAndIncome} />
          <div className={formTabIncomeClass} data-update-mode={isUpdateMode}>
            <button
              className={Styles.FormTabButton}
              disabled={this.state.formKind === DocTypes.RecordKind.Income}
              onClick={() => {
                this.onFormKindTabCicked(DocTypes.RecordKind.Income);
              }}
            >
              <img className={formSvgIconClass} src="./image/icon-ex/income-outline.svg" />
              <span className={Styles.FormTabLabel}>収入</span>
            </button>
          </div>
          <div className={formTabBorder} data-hidden={formTabBorderHiddenIncomeAndOutgo} />
          <div className={formTabOutgoClass} data-update-mode={isUpdateMode}>
            <button
              className={Styles.FormTabButton}
              disabled={this.state.formKind === DocTypes.RecordKind.Outgo}
              onClick={() => {
                this.onFormKindTabCicked(DocTypes.RecordKind.Outgo);
              }}
            >
              <img className={formSvgIconClass} src="./image/icon-ex/outgo-outline.svg" />
              <span className={Styles.FormTabLabel}>支出</span>
            </button>
          </div>
          <div className={formTabBorder} data-hidden={formTabBorderHiddenOutgo} />
          <div className={Styles.FormTabSideSpace} />
        </div>
      </div>
    );

    const formInput = (
      <div className={formInputRootClass}>
        <table>
          <tbody>
            <tr>
              <th scope="row">日付</th>
              <td>
                <input
                  type="text"
                  id={this.elementIdFormDate}
                  value={this.state.formDate}
                  readOnly={true}
                  onClick={() => {
                    this.onFormDateClicked();
                  }}
                  onKeyDown={(e) => {
                    this.onFormDateKeyDown(e);
                  }}
                />
                {submitSuccessNotice}
              </td>
            </tr>
            <tr className={formInputRowCategoryOutgoClass}>
              <th scope="row">カテゴリ</th>
              <td>
                <input
                  type="text"
                  id={this.elementIdFormCategoryOutgo}
                  className={formInputCategoryClass}
                  readOnly={true}
                  value={this.categoryOutgoDisplayText()}
                  onClick={(e) => {
                    this.onFormCategoryClicked(e.currentTarget);
                  }}
                  onKeyDown={(e) => {
                    this.onFormCategoryKeyDown(e);
                  }}
                />
              </td>
            </tr>
            <tr className={formInputRowCategoryIncomeClass}>
              <th scope="row">カテゴリ</th>
              <td>
                <input
                  type="text"
                  id={this.elementIdFormCategoryIncome}
                  className={formInputCategoryClass}
                  readOnly={true}
                  value={this.categoryIncomeDisplayText()}
                  onClick={(e) => {
                    this.onFormCategoryClicked(e.currentTarget);
                  }}
                  onKeyDown={(e) => {
                    this.onFormCategoryKeyDown(e);
                  }}
                />
              </td>
            </tr>
            <tr className={formInputRowAcountClass}>
              <th scope="row">口座</th>
              <td>
                <select
                  value={this.state.formAccount.toString()}
                  className={formInputAccountSelectClass}
                  id={this.elementIdFormAccount}
                  onChange={(event) => {
                    this.onFormAccountChanged(event.target);
                  }}
                  onKeyDown={(event) => {
                    this.onKeyDownCommon(event);
                  }}
                >
                  {DocStateMethods.basicAccountOrderMixed(this.props.doc).map((accountId) => {
                    const account = basicAccounts[accountId];
                    return (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    );
                  })}
                </select>
              </td>
            </tr>
            <tr className={formInputRowAcountFromToClass}>
              <th scope="row">送金元</th>
              <td>
                <select
                  value={this.state.formAccountFrom}
                  className={formInputAccountSelectClass}
                  id={this.elementIdFormAccountFrom}
                  onChange={(event) => {
                    this.onFormAccountFromChanged(event.target);
                  }}
                  onKeyDown={(event) => {
                    this.onKeyDownCommon(event);
                  }}
                >
                  <option value={DocTypes.INVALID_ID}>（未選択）</option>
                  {DocStateMethods.basicAccountOrderMixed(this.props.doc).map((accountId) => {
                    const account = basicAccounts[accountId];
                    return (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    );
                  })}
                </select>
                {accountFromErrorMsg}
              </td>
            </tr>
            <tr className={formInputRowAcountFromToClass}>
              <th scope="row">送金先</th>
              <td>
                <select
                  value={this.state.formAccountTo}
                  className={formInputAccountSelectClass}
                  id={this.elementIdFormAccountTo}
                  onChange={(event) => {
                    this.onFormAccountToChanged(event.target);
                  }}
                  onKeyDown={(event) => {
                    this.onKeyDownCommon(event);
                  }}
                >
                  <option value={DocTypes.INVALID_ID}>（未選択）</option>
                  {DocStateMethods.basicAccountOrderMixed(this.props.doc).map((accountId) => {
                    const account = basicAccounts[accountId];
                    return (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    );
                  })}
                </select>
                {accountToErrorMsg}
              </td>
            </tr>
            <tr className={formInputRowAmountClass}>
              <th scope="row">金額</th>
              <td>
                <input
                  type="text"
                  id={this.elementIdFormAmount}
                  value={this.state.formAmount.toString()}
                  onChange={(event) => {
                    this.onFormAmountChanged(event.target);
                  }}
                  onKeyDown={(event) => {
                    this.onKeyDownCommon(event);
                  }}
                  onFocus={(event) => {
                    event.target.select();
                  }}
                  onClick={(event) => {
                    event.currentTarget.select();
                    return false;
                  }}
                />
                {amountErrorMsg}
              </td>
            </tr>
            <tr className={formInputRowAmountTransferClass}>
              <th scope="row">送金額</th>
              <td>
                <input
                  type="text"
                  id={this.elementIdFormAmountTransfer}
                  value={this.state.formAmountTransfer.toString()}
                  onChange={(event) => {
                    this.onFormAmountTransferChanged(event.target);
                  }}
                  onKeyDown={(event) => {
                    this.onKeyDownCommon(event);
                  }}
                  onFocus={(event) => {
                    event.target.select();
                  }}
                  onClick={(event) => {
                    event.currentTarget.select();
                    return false;
                  }}
                />
                {amountTransferErrorMsg}
              </td>
            </tr>
            <tr>
              <th scope="row">メモ</th>
              <td>
                <input
                  className={Styles.FormInputMemo}
                  type="text"
                  id={this.elementIdFormMemo}
                  value={this.state.formMemo}
                  onChange={(event) => {
                    this.onFormMemoChanged(event.target);
                  }}
                  onKeyDown={(event) => {
                    this.onKeyDownCommon(event);
                  }}
                  onFocus={(event) => {
                    event.target.select();
                  }}
                  onClick={(event) => {
                    event.currentTarget.select();
                    return false;
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
    const formFooter = (
      <div className={formFooterRootClass}>
        <div className={Styles.FormDeleteBtnHolder} data-update-mode={isUpdateMode}>
          <button
            className={formDeleteBtnClass}
            onClick={(e) => {
              this.onFormDeleteBtnPushed(e);
            }}
          >
            <MaterialIcon name={'delete'} classNames={[]} darkMode={false} />
            削除
          </button>
        </div>
        <button
          type="button"
          className={formSubmitBtnClass}
          id={this.elementIdFormSubmit}
          data-toggle="tooltip"
          onClick={(e) => {
            this.onFormSubmitButtonClicked(e);
          }}
        >
          {isUpdateMode ? '更新' : '追加'}
        </button>
      </div>
    );

    const sectionRightSide = (
      <div id={this.elementIdSectionRightSide} className={Styles.SectionRightSideRoot}>
        <div className={Styles.FormRoot} data-is-any-record-selected={this.state.selectedRecordId !== null}>
          {formTabs}
          {formInput}
          {formFooter}
        </div>
      </div>
    );

    return (
      <div
        className={rootClass}
        id={this.elementIdRoot}
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
            <div className={dialogHeaderClass}>
              <h5 className="modal-title" id="exampleModalLabel">
                レコードの追加と編集
              </h5>
              <button
                type="button"
                id={this.elementIdCloseBtn}
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className={Styles.SectionRoot}>
              {sectionLeftSide}
              {sectionRightSide}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /// リストに表示するレコードのキー群。
  private listRecords() {
    // 追加レコードに関しては削除されている可能性があるので存在チェックをする
    const records = this.additionalRecordKeys.filter((key) => {
      return (
        key.id in this.props.doc.income.records ||
        key.id in this.props.doc.outgo.records ||
        key.id in this.props.doc.transfer.records
      );
    });
    return records.concat(
      new RecordCollection(this.props.doc)
        .filter([RecordFilters.createRecordIdRangeFilter({ startId: this.viewRecordIdMin, endId: null })])
        .keys([{ kind: RecordOrderKind.RecordId, reverse: false }]),
    );
  }

  /// ダイアログ全体のホットキー対応。
  private onRootKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // ESC でダイアログを閉じる。
    if (e.keyCode === 27) {
      e.stopPropagation();
      $(`#${this.elementIdCloseBtn}`).trigger('click');
      return;
    }
  }

  /// リスト背景がクリックされたときの処理。
  private onListBackgroundClicked(e: React.MouseEvent<HTMLElement>) {
    // イベント受理
    e.stopPropagation();

    // 状態変更
    this.setState({
      selectedRecordId: null,
    });
  }

  /// リスト項目がクリックされたときの処理。
  private onListCardClicked(e: React.MouseEvent<HTMLElement>, recordId: number, recordKind: DocTypes.RecordKind) {
    // イベント受理
    e.stopPropagation();

    // 変更がなければ何もしない
    if (recordId === this.state.selectedRecordId) {
      return;
    }

    // 新規レコード対応の場合
    if (recordKind === DocTypes.RecordKind.Invalid) {
      this.setState({
        selectedRecordId: recordId,
      });
      this.resetForNewInput();
      return;
    }

    // 既存レコードの場合
    this.setState({
      amountErrorMsg: '',
      amountTransferErrorMsg: '',
      accountFromErrorMsg: '',
      accountToErrorMsg: '',
    });
    switch (recordKind) {
      case DocTypes.RecordKind.Income: {
        const record = this.props.doc.income.records[recordId];
        this.setState({
          selectedRecordId: recordId,
          formKind: recordKind,
          formDate: IYearMonthDayDateUtils.toDisplayFormatText(record.date),
          formCategoryIncome: record.category,
          formAccount: record.account,
          formAmount: Math.abs(record.amount),
          formAmountIsNegative: record.amount < 0,
          formMemo: record.memo,
        });
        break;
      }

      case DocTypes.RecordKind.Outgo: {
        const record = this.props.doc.outgo.records[recordId];
        this.setState({
          selectedRecordId: recordId,
          formKind: recordKind,
          formDate: IYearMonthDayDateUtils.toDisplayFormatText(record.date),
          formCategoryOutgo: record.category,
          formAccount: record.account,
          formAmount: Math.abs(record.amount),
          formAmountIsNegative: record.amount < 0,
          formMemo: record.memo,
        });
        break;
      }

      case DocTypes.RecordKind.Transfer: {
        const record = this.props.doc.transfer.records[recordId];
        this.setState({
          selectedRecordId: recordId,
          formKind: recordKind,
          formDate: IYearMonthDayDateUtils.toDisplayFormatText(record.date),
          formAccountFrom: record.accountFrom,
          formAccountTo: record.accountTo,
          formAmountTransfer: record.amount,
          formMemo: record.memo,
        });
        break;
      }
    }
  }

  /// カテゴリインプットに表示するテキストを返す。
  private categoryOutgoDisplayText(): string {
    return DocStateMethods.categoryOutgoFullPathDisplayText(this.props.doc, this.state.formCategoryOutgo);
  }
  private categoryIncomeDisplayText(): string {
    return DocStateMethods.categoryIncomeFullPathDisplayText(this.props.doc, this.state.formCategoryIncome);
  }

  /// 新規入力用に各項目をリセットする。
  private resetForNewInput() {
    this.setState({
      formAccountFrom: DocTypes.INVALID_ID,
      formAccountTo: DocTypes.INVALID_ID,
      formAmount: 0,
      formAmountTransfer: 0,
      formAmountIsNegative: false,
      formMemo: '',
      amountErrorMsg: '',
      amountTransferErrorMsg: '',
      accountFromErrorMsg: '',
      accountToErrorMsg: '',
    });
  }

  /// レコード種類タブボタンが押されたときの処理。
  private onFormKindTabCicked(kind: DocTypes.RecordKind) {
    this.resetForNewInput();
    this.setState({
      formKind: kind,
    });
    $(`#${this.elementIdFormDate}`).focus();
  }

  /// 日付変更時の処理。
  private onFormDateChanged(dateText: string) {
    this.setState({ formDate: dateText });
  }
  /// 日付がクリックされたときの処理。
  private onFormDateClicked() {
    $(`#${this.elementIdFormDate}`).datepicker('show');
  }

  /// 日付でキー入力したときの処理。
  private onFormDateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    this.onKeyDownCommon(e);
  }

  /// カテゴリがクリックされたときの処理。
  private onFormCategoryClicked(sender: HTMLInputElement) {
    $(`#${sender.id}`).contextMenu();
  }

  // カテゴリでキー入力したときの処理。
  private onFormCategoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // コンテキストメニューが出ている状態の ESC がなぜか伝搬されているようなのでここでガードする。
    const isContextMenuActive = $('#context-menu-layer').length !== 0;
    if (e.keyCode === 27 && isContextMenuActive) {
      e.stopPropagation();
      return;
    }

    // 下キーを押したらコンテキストメニューを表示
    if (e.keyCode === 40 && !isContextMenuActive) {
      $(`#${e.currentTarget.id}`).contextMenu();
      e.stopPropagation();
      return;
    }

    // 共通処理
    this.onKeyDownCommon(e);
  }

  /// 口座値変更時の処理。
  private onFormAccountChanged(sender: HTMLSelectElement) {
    this.setState({ formAccount: Number(sender.value) });
  }

  /// 送金元値変更時の処理。
  private onFormAccountFromChanged(sender: HTMLSelectElement) {
    const newAccountFrom = Number(sender.value);
    let accountTo = this.state.formAccountTo;
    if (newAccountFrom !== DocTypes.INVALID_ID && newAccountFrom === accountTo) {
      // 同じ口座を選ばせないようにするために片方を未選択にする
      accountTo = DocTypes.INVALID_ID;
    }
    this.setState({
      formAccountFrom: newAccountFrom,
      formAccountTo: accountTo,
    });
  }

  /// 送金先値変更時の処理。
  private onFormAccountToChanged(sender: HTMLSelectElement) {
    const newAccountTo = Number(sender.value);
    let accountFrom = this.state.formAccountFrom;
    if (newAccountTo !== DocTypes.INVALID_ID && newAccountTo === accountFrom) {
      // 同じ口座を選ばせないようにするために片方を未選択にする
      accountFrom = DocTypes.INVALID_ID;
    }
    this.setState({
      formAccountFrom: accountFrom,
      formAccountTo: newAccountTo,
    });
  }

  /// 金額値変更時の処理。
  private onFormAmountChanged(sender: HTMLInputElement) {
    const newValue = Number(sender.value.replace(/[^\d]/, ''));
    if (!isNaN(newValue)) {
      // '-' の数分フラグを反転させる
      const negCount = sender.value.split('-').length - 1;
      const isNegative = negCount % 2 === 0 ? this.state.formAmountIsNegative : !this.state.formAmountIsNegative;
      this.setState({ formAmount: newValue, formAmountIsNegative: isNegative });
    }
  }

  /// 送金額値変更時の処理。
  private onFormAmountTransferChanged(sender: HTMLInputElement) {
    const newValue = Number(sender.value.replace(/[^\d]/, ''));
    if (!isNaN(newValue)) {
      this.setState({ formAmountTransfer: newValue });
    }
  }

  /// メモ変更時の処理。
  private onFormMemoChanged(sender: HTMLInputElement) {
    this.setState({ formMemo: sender.value });
  }

  /// 削除ボタンクリック時処理。
  private onFormDeleteBtnPushed(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    // イベント受理
    e.stopPropagation();

    // 新規レコードや未選択状態でここにくることはないはず
    if (this.state.selectedRecordId === null || this.state.selectedRecordId === NEW_RECORD_ID) {
      throw new Error();
    }
    const deleteRecordId: number = this.state.selectedRecordId;

    // ダイアログで確認
    const dialog = remote.dialog;
    const msgBoxResult = dialog.showMessageBoxSync(remote.getCurrentWindow(), {
      type: 'warning',
      buttons: ['削除する', 'キャンセル'],
      defaultId: 0,
      cancelId: 1,
      title: 'レコードの削除',
      message: '選択中のレコードを削除しますか？',
    });
    if (msgBoxResult === 1) {
      return;
    }

    // 選択状態を変更
    const records = this.listRecords();
    let nextSelectedId = NEW_RECORD_ID;
    if (2 <= records.length) {
      const idx = records.findIndex((key) => key.id === deleteRecordId);
      if (idx + 1 === records.length) {
        // 終端の場合は自分の前にあるレコードを選択
        nextSelectedId = records[idx - 1].id;
      } else {
        // 通常は自分の次にあるレコードを選択
        nextSelectedId = records[idx + 1].id;
      }
    }
    this.setState({
      selectedRecordId: nextSelectedId,
    });

    // レコードを削除
    Store.dispatch(DocActions.deleteRecords([deleteRecordId]));

    // 自動保存リクエスト
    Store.dispatch(UiActions.documentRequestAutoSave());
  }

  /// 追加・更新ボタンクリック時処理。
  private onFormSubmitButtonClicked(e: React.MouseEvent<HTMLElement>) {
    // イベント受理
    e.stopPropagation();

    // エラーチェック
    const errorMsgValidAmount = '0以外の値を入力してください';
    let amountErrorMsg: string | null = null;
    let amountTransferErrorMsg: string | null = null;
    let accountFromErrorMsg: string | null = null;
    let accountToErrorMsg: string | null = null;
    if (this.state.formKind === DocTypes.RecordKind.Transfer) {
      const errorMsgNeedsInput = '入力してください';
      if (this.state.formAmountTransfer === 0) {
        amountTransferErrorMsg = errorMsgValidAmount;
      }
      if (this.state.formAccountFrom === DocTypes.INVALID_ID) {
        accountFromErrorMsg = errorMsgNeedsInput;
      }
      if (this.state.formAccountTo === DocTypes.INVALID_ID) {
        accountToErrorMsg = errorMsgNeedsInput;
      }
    } else {
      if (this.state.formAmount === 0) {
        amountErrorMsg = errorMsgValidAmount;
      }
    }
    this.setState({
      amountErrorMsg,
      amountTransferErrorMsg,
      accountFromErrorMsg,
      accountToErrorMsg,
    });
    if (
      amountErrorMsg != null ||
      amountTransferErrorMsg != null ||
      accountFromErrorMsg != null ||
      accountToErrorMsg != null
    ) {
      return;
    }

    // 追加・更新イベントを実行
    const isUpdateMode = this.state.selectedRecordId !== NEW_RECORD_ID;
    switch (this.state.formKind) {
      case DocTypes.RecordKind.Outgo:
        if (isUpdateMode) {
          if (this.state.selectedRecordId === null) {
            throw new Error();
          }
          Store.dispatch(
            DocActions.updateRecordOutgo(
              this.state.selectedRecordId,
              new Date(),
              IYearMonthDayDateUtils.fromText(this.state.formDate),
              this.state.formMemo,
              this.state.formAccount,
              this.state.formCategoryOutgo,
              (this.state.formAmountIsNegative ? -1 : 1) * this.state.formAmount,
            ),
          );
        } else {
          Store.dispatch(
            DocActions.addRecordOutgo(
              new Date(),
              IYearMonthDayDateUtils.fromText(this.state.formDate),
              this.state.formMemo,
              this.state.formAccount,
              this.state.formCategoryOutgo,
              (this.state.formAmountIsNegative ? -1 : 1) * this.state.formAmount,
            ),
          );
        }
        // 最終入力値記憶
        Store.dispatch(
          UiActions.recordEditDialogUpdateLatestValue(this.state.formAccount, null, this.state.formCategoryOutgo),
        );
        break;

      case DocTypes.RecordKind.Income:
        if (isUpdateMode) {
          if (this.state.selectedRecordId === null) {
            throw new Error();
          }
          Store.dispatch(
            DocActions.updateRecordIncome(
              this.state.selectedRecordId,
              new Date(),
              IYearMonthDayDateUtils.fromText(this.state.formDate),
              this.state.formMemo,
              this.state.formAccount,
              this.state.formCategoryIncome,
              (this.state.formAmountIsNegative ? -1 : 1) * this.state.formAmount,
            ),
          );
        } else {
          Store.dispatch(
            DocActions.addRecordIncome(
              new Date(),
              IYearMonthDayDateUtils.fromText(this.state.formDate),
              this.state.formMemo,
              this.state.formAccount,
              this.state.formCategoryIncome,
              (this.state.formAmountIsNegative ? -1 : 1) * this.state.formAmount,
            ),
          );
        }
        // 最終入力値記憶
        Store.dispatch(
          UiActions.recordEditDialogUpdateLatestValue(this.state.formAccount, this.state.formCategoryIncome, null),
        );
        break;

      case DocTypes.RecordKind.Transfer:
        if (isUpdateMode) {
          if (this.state.selectedRecordId === null) {
            throw new Error();
          }
          Store.dispatch(
            DocActions.updateRecordTransfer(
              this.state.selectedRecordId,
              new Date(),
              IYearMonthDayDateUtils.fromText(this.state.formDate),
              this.state.formMemo,
              this.state.formAccountFrom,
              this.state.formAccountTo,
              this.state.formAmountTransfer != null ? this.state.formAmountTransfer : 0,
            ),
          );
        } else {
          Store.dispatch(
            DocActions.addRecordTransfer(
              new Date(),
              IYearMonthDayDateUtils.fromText(this.state.formDate),
              this.state.formMemo,
              this.state.formAccountFrom,
              this.state.formAccountTo,
              this.state.formAmountTransfer != null ? this.state.formAmountTransfer : 0,
            ),
          );
        }
        break;
    }

    // 自動保存リクエスト
    Store.dispatch(UiActions.documentRequestAutoSave());

    // 成功メッセージ設定
    this.setState({
      submitSuccessMsg: isUpdateMode ? '更新しました' : '追加しました',
    });

    // 続けて入力用の処理
    if (!isUpdateMode) {
      this.resetForNewInput();
    }
    $(`#${this.elementIdFormDate}`).focus();
    $(`.${Styles.FormNoticeMsg}`).animate({ opacity: 1.0 }, 0).delay(1000).animate({ opacity: 0.0 }, 750);
  }

  /// 共通キーダウンイベント処理。
  private onKeyDownCommon(event: React.KeyboardEvent<HTMLElement>) {
    // Command + Enter で追加ボタンを押下
    if (event.keyCode === 13 && event.metaKey) {
      $(`#${this.elementIdFormSubmit}`).click();
      event.stopPropagation();
      event.preventDefault();
      return;
    }
  }
}

const mapStateToProps = (state: IStoreState, props: IProps) => {
  const result: ILocalProps = Object.assign({}, props, {
    doc: state.doc,
    dialogRecordAdd: state.ui.dialogAddRecord,
  });
  return result;
};
export default ReactRedux.connect(mapStateToProps)(Main);
