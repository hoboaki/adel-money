import 'src/@types/mdb/modal';

import ClassNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as DocActions from 'src/state/doc/Actions';
import * as DocStateMethods from 'src/state/doc/StateMethods';
import * as DocStates from 'src/state/doc/States';
import * as DocTypes from 'src/state/doc/Types';
import IStoreState from 'src/state/IStoreState';
import Store from 'src/state/Store';
import * as UiActions from 'src/state/ui/Actions';
import * as IYearMonthDayDateUtils from 'src/util/IYearMonthDayDateUtils';
import BasicStyles from 'src/view/Basic.css';
import { v4 as UUID } from 'uuid';

import Styles from './Main.css';

interface IProps {
  /** 追加・編集する口座種類。(Assets or Liabilities) */
  accountKind: DocTypes.AccountKind;

  /** 編集する場合は口座のIDを指定。 */
  editAccountId: number | null;

  /** 閉じる際のコールバック。 */
  onClosed: (isCanceled: boolean) => void;
}

interface ILocalProps extends IProps {
  doc: DocStates.IState;
}

interface IState {
  inputName: string;
  inputKind: DocTypes.BasicAccountKind;
  inputStartDate: string;
  inputInitialAmount: number;
  inputInitialAmountIsNegative: boolean;
  isCanceled: boolean;
}

class Main extends React.Component<ILocalProps, IState> {
  private elementIdRoot: string;
  private elementIdCloseBtn: string;
  private elementIdInputStartDate: string;
  private elementIdSubmitBtn: string;

  constructor(props: ILocalProps) {
    super(props);
    global.console.assert(
      this.props.accountKind === DocTypes.AccountKind.Assets ||
      this.props.accountKind === DocTypes.AccountKind.Liabilities,
    );
    if (props.editAccountId !== null) {
      const account = DocStateMethods.basicAccounts(props.doc)[props.editAccountId];
      this.state = {
        inputName: account.name,
        inputKind: account.kind,
        inputStartDate: IYearMonthDayDateUtils.toDisplayFormatText(account.startDate),
        inputInitialAmount: account.initialAmount,
        inputInitialAmountIsNegative: false,
        isCanceled: true,
      };
    } else {
      this.state = {
        inputName: '',
        inputKind:
          props.accountKind === DocTypes.AccountKind.Assets
            ? DocTypes.BasicAccountKind.AssetsCash
            : DocTypes.BasicAccountKind.LiabilitiesCard,
        inputStartDate: IYearMonthDayDateUtils.toDisplayFormatText(IYearMonthDayDateUtils.today()),
        inputInitialAmount: 0,
        inputInitialAmountIsNegative: false,
        isCanceled: true,
      };
    }
    this.elementIdRoot = `elem-${UUID()}`;
    this.elementIdCloseBtn = `elem-${UUID()}`;
    this.elementIdInputStartDate = `elem-${UUID()}`;
    this.elementIdSubmitBtn = `elem-${UUID()}`;
  }

  public componentDidMount() {
    // DatePicker セットアップ
    $(`#${this.elementIdInputStartDate}`)
      .datepicker({
        format: 'yyyy/mm/dd',
        todayBtn: 'linked',
        language: 'ja',
        autoclose: true,
        todayHighlight: true,
        showOnFocus: false,
      })
      .on('changeDate', (e) => {
        this.onInputStartDateChanged(e.format('yyyy/mm/dd'));
      });

    // ダイアログ表示
    $(`#${this.elementIdRoot}`).modal({ show: true, backdrop: false });

    // ダイアログ閉じたらコールバック
    $(`#${this.elementIdRoot}`).on('hidden.bs.modal', () => {
      this.props.onClosed(this.state.isCanceled);
    });
  }

  public render() {
    // ヘッダ
    const dialogHeaderClass = ClassNames('modal-header', Styles.DialogHeader);
    const header = (
      <div className={dialogHeaderClass}>
        <h5 className="modal-title" id="exampleModalLabel">
          {`${this.props.accountKind === DocTypes.AccountKind.Assets ? '資産口座' : '負債口座'}の${this.props.editAccountId !== null ? '編集' : '作成'
            }`}
        </h5>
        <button type="button" id={this.elementIdCloseBtn} className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    );

    // 本体
    const inputName = (
      <tr className={Styles.InputName}>
        <th scope="row">名前</th>
        <td>
          <input
            type="text"
            value={this.state.inputName}
            onChange={(e) => {
              this.onInputNameChanged(e);
            }}
            onFocus={(e) => {
              e.stopPropagation();
              e.target.select();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.select();
              return false;
            }}
          />
        </td>
      </tr>
    );
    const inputKind = (
      <tr className={Styles.InputKind}>
        <th scope="row">種類</th>
        <td>
          <select
            value={this.state.inputKind.toString()}
            onChange={(e) => {
              this.onInputKindChanged(e);
            }}
          >
            {(() => {
              const kinds: DocTypes.BasicAccountKind[] = [];
              if (this.props.accountKind === DocTypes.AccountKind.Assets) {
                kinds.push(DocTypes.BasicAccountKind.AssetsCash);
                kinds.push(DocTypes.BasicAccountKind.AssetsBank);
                kinds.push(DocTypes.BasicAccountKind.AssetsInvesting);
                kinds.push(DocTypes.BasicAccountKind.AssetsOther);
              } else {
                kinds.push(DocTypes.BasicAccountKind.LiabilitiesCard);
                kinds.push(DocTypes.BasicAccountKind.LiabilitiesOther);
              }
              return kinds.map((kind) => {
                return (
                  <option key={kind} value={kind}>
                    {DocTypes.localizedBasicAccountKind(kind)}
                  </option>
                );
              });
            })()}
          </select>
        </td>
      </tr>
    );
    const inputStartDate = (
      <tr className={Styles.InputStartDate}>
        <th scope="row">開始日</th>
        <td>
          <input
            id={this.elementIdInputStartDate}
            type="text"
            value={this.state.inputStartDate}
            readOnly={true}
            onClick={(e) => {
              this.onInputStartDateClicked(e);
            }}
          />
        </td>
      </tr>
    );
    const inputInitialAmount = (
      <tr className={Styles.InputInitialAmount} data-is-negative={this.state.inputInitialAmountIsNegative}>
        <th scope="row">初期残高</th>
        <td>
          <input
            type="text"
            value={this.state.inputInitialAmount.toString()}
            onChange={(e) => {
              this.onInputInitialAmountChanged(e);
            }}
            onFocus={(e) => {
              e.stopPropagation();
              e.target.select();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.select();
              return false;
            }}
          />
        </td>
      </tr>
    );
    const body = (
      <div className={Styles.InputRoot}>
        <table>
          <tbody>
            {inputName}
            {inputKind}
            {inputStartDate}
            {inputInitialAmount}
          </tbody>
        </table>
      </div>
    );

    // フッタ
    const submitBtnClass = ClassNames(BasicStyles.StdBtnSecondary);
    const footer = (
      <div className={Styles.FooterRoot}>
        <button
          id={this.elementIdSubmitBtn}
          className={submitBtnClass}
          disabled={this.state.inputName === ''}
          onClick={(e) => this.onSubmitBtnClicked(e)}
        >
          {this.props.editAccountId !== null ? '更新' : '追加'}
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
            {body}
            {footer}
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
      $(`#${this.elementIdSubmitBtn}`).click();
      return;
    }
  }

  /// 取込ボタンが押されたときの処理。
  private onSubmitBtnClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    e.stopPropagation();

    // 追加or更新
    {
      const initialAmount = (this.state.inputInitialAmountIsNegative ? -1 : 1) * this.state.inputInitialAmount;
      const startDate = IYearMonthDayDateUtils.fromText(this.state.inputStartDate);
      if (this.props.editAccountId === null) {
        Store.dispatch(
          DocActions.addBasicAccount(this.state.inputName, this.state.inputKind, initialAmount, startDate),
        );
      } else {
        Store.dispatch(
          DocActions.updateBasicAccount(
            this.props.editAccountId,
            this.state.inputName,
            this.state.inputKind,
            initialAmount,
            startDate,
          ),
        );
      }
    }

    // 自動保存リクエスト
    Store.dispatch(UiActions.documentRequestAutoSave());

    // ダイアログ閉じる
    this.setState({ isCanceled: false });
    $(`#${this.elementIdRoot}`).modal('hide');
  }

  /// 名前：値更新。
  private onInputNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    this.setState({ inputName: e.target.value });
  }

  /// 種類：値更新。
  private onInputKindChanged(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    this.setState({ inputKind: Number(e.target.value) });
  }

  /// 開始日：クリックイベント。
  private onInputStartDateClicked(e: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    e.stopPropagation();
    $(`#${this.elementIdInputStartDate}`).datepicker('show');
  }

  /// 開始日：値更新。
  private onInputStartDateChanged(dateText: string) {
    this.setState({
      inputStartDate: dateText,
    });
  }

  /// 初期残高：値更新。
  private onInputInitialAmountChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = Number(e.target.value.replace(/[^\d]/, ''));
    if (!isNaN(newValue)) {
      // '-' の数分フラグを反転させる
      const negCount = e.target.value.split('-').length - 1;
      const isNegative =
        negCount % 2 === 0 ? this.state.inputInitialAmountIsNegative : !this.state.inputInitialAmountIsNegative;
      this.setState({ inputInitialAmount: newValue, inputInitialAmountIsNegative: isNegative });
    }
  }
}

const mapStateToProps = (state: IStoreState, props: IProps) => {
  const result: ILocalProps = Object.assign({}, props, {
    doc: state.doc,
  });
  return result;
};
export default ReactRedux.connect(mapStateToProps)(Main);
