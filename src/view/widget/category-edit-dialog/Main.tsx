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
import BasicStyles from 'src/view/Basic.css';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';
import { v4 as UUID } from 'uuid';

import Styles from './Main.css';

interface IProps {
  /** 追加・編集するカテゴリ種類。 */
  categoryKind: DocTypes.CategoryKind;

  /** 編集する場合は口座のIDを指定。 */
  editCategoryId: number | null;

  /** 親カテゴリID。 */
  parentCategoryId: number | null;

  /** 閉じる際のコールバック。 */
  onClosed: (isCanceled: boolean) => void;
}

interface ILocalProps extends IProps {
  doc: DocStates.IState;
}

interface IState {
  inputName: string;
  isCanceled: boolean;
}

class Main extends React.Component<ILocalProps, IState> {
  private elementIdRoot: string;
  private elementIdCloseBtn: string;
  private elementIdSubmitBtn: string;

  constructor(props: ILocalProps) {
    super(props);
    global.console.assert(
      this.props.categoryKind === DocTypes.CategoryKind.Income ||
      this.props.categoryKind === DocTypes.CategoryKind.Outgo,
    );
    if (props.editCategoryId !== null) {
      const category = DocStateMethods.categoryById(props.doc, props.editCategoryId);
      this.state = {
        inputName: category.name,
        isCanceled: true,
      };
    } else {
      this.state = {
        inputName: '',
        isCanceled: true,
      };
    }
    this.elementIdRoot = `elem-${UUID()}`;
    this.elementIdCloseBtn = `elem-${UUID()}`;
    this.elementIdSubmitBtn = `elem-${UUID()}`;
  }

  public componentDidMount() {
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
          {`${this.props.categoryKind === DocTypes.CategoryKind.Income ? '収入カテゴリ' : '支出カテゴリ'}の${this.props.editCategoryId !== null ? '編集' : '作成'
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
    const body = (
      <div className={Styles.InputRoot}>
        <table>
          <tbody>{inputName}</tbody>
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
          {this.props.editCategoryId !== null ? '更新' : '追加'}
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
      if (this.props.editCategoryId === null) {
        if (this.props.parentCategoryId === null) {
          throw new Error();
        }
        Store.dispatch(
          DocActions.addCategory(this.props.categoryKind, this.state.inputName, this.props.parentCategoryId),
        );
      } else {
        Store.dispatch(DocActions.updateCategory(this.props.editCategoryId, this.state.inputName));
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
}

const mapStateToProps = (state: IStoreState, props: IProps) => {
  const result: ILocalProps = Object.assign({}, props, {
    doc: state.doc,
  });
  return result;
};
export default ReactRedux.connect(mapStateToProps)(Main);
