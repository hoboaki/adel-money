import * as remote from '@electron/remote';
import ClassNames from 'classnames';
import { Menu } from 'electron';
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
import CategoryEditDialog from 'src/view/widget/category-edit-dialog';
import MaterialIcon from 'src/view/widget/material-icon';
import * as NativeDialogUtils from 'src/view/widget/native-dialog-utils';
import RadioButtonGroup from 'src/view/widget/radio-button-group';
import { v4 as UUID } from 'uuid';

import Styles from './Category.css';
import Header from './Header';

enum ModalState {
  None,
  Add,
  Edit,
}

interface IProps {
  doc: DocStates.IState;
}

interface IState {
  /** 選択中のタブ。 */
  selectedTab: DocTypes.CategoryKind;

  /** カテゴリ編集対象。 */
  editCategoryId: number | null;

  /** カテゴリ追加時の親カテゴリID。 */
  categoryIdForAddChild: number | null;

  /** カードのコンテキストメニュー表示中か。 */
  cardActionMenuActive: boolean;

  /** 編集ダイアログのモーダル状態。。 */
  modalState: ModalState;
}

class Category extends React.Component<IProps, IState> {
  private cardActionMenu: Menu | null = null;
  private elemIdCategoryList: string;
  private sortedGroup: string;

  public constructor(props: IProps) {
    super(props);
    this.state = {
      selectedTab: DocTypes.CategoryKind.Income,
      editCategoryId: null,
      categoryIdForAddChild: null,
      modalState: ModalState.None,
      cardActionMenuActive: false,
    };
    this.elemIdCategoryList = `elem-${UUID()}`;
    this.sortedGroup = `sorted-group-${UUID()}`;
  }

  public componentDidMount() {
    this.setupSortable();
  }

  public componentDidUpdate() {
    this.setupSortable();
  }

  public render() {
    const rootClass = ClassNames(PageStyles.Base, LayoutStyles.TopToBottom);
    const header = <Header title={'カテゴリ設定'} iconName="class" />;

    const btnInfos = [
      { label: '収入', onChanged: () => this.onTabChanged(DocTypes.CategoryKind.Income) },
      { label: '支出', onChanged: () => this.onTabChanged(DocTypes.CategoryKind.Outgo) },
    ];
    const controlBar = (
      <div className={Styles.ControlBar}>
        <div className={Styles.ControlBarAreaLeft}>
          <RadioButtonGroup btns={btnInfos} selectedBtnIndex={this.state.selectedTab - 1} />
        </div>
        <div className={Styles.ControlBarAreaRight}></div>
      </div>
    );

    const recordCountsDict = this.recordCountsDict();
    const rootCard = (() => {
      const categories =
        this.state.selectedTab === DocTypes.CategoryKind.Income
          ? this.props.doc.income.categories
          : this.props.doc.outgo.categories;

      const categoryConverter = (categoryId: number, indentLevel: number) => {
        // 自身
        const self = categories[categoryId];
        const selfName =
          indentLevel === 0 ? (this.state.selectedTab === DocTypes.CategoryKind.Income ? '収入' : '支出') : self.name;
        const reorder =
          indentLevel === 0 ? null : (
            <MaterialIcon name="reorder" classNames={[Styles.CategoryCardHeaderHandle]} darkMode={false} />
          );
        const recordCountBadge =
          self.id in recordCountsDict ? (
            <span className={Styles.CategoryCardHeaderRecordCountBadge}>{recordCountsDict[self.id]}件</span>
          ) : null;

        // 子
        const childElems = self.childs.map((id) => categoryConverter(id, indentLevel + 1));
        const childs =
          childElems.length === 0 ? null : (
            <div id={`${this.elemIdCategoryList}-${categoryId}`} className={Styles.CategoryList}>
              {childElems}
            </div>
          );

        // key には子供の数を入れておくことで
        // 親が変わるような移動が発生した場合に親カテゴリ毎Reactに再レンダリングさせる
        // そうすることで SortableJS が消した要素を React 側も消そうとする際に発生する例外を防ぐ
        const key = `${this.state.selectedTab}-childs${self.childs.length}-${categoryId}`;
        return (
          <div
            key={key}
            className={Styles.CategoryCard}
            data-selected={this.state.cardActionMenuActive && this.state.editCategoryId === categoryId}
          >
            <div className={Styles.CategoryCardHeader}>
              {reorder}
              <span>{selfName}</span>
              {recordCountBadge}
              <div className={Styles.CategoryCardHeaderTailSpace}>
                <button className={BasicStyles.IconBtn} onClick={(e) => this.onCardActionBtnClicked(e, categoryId)}>
                  <MaterialIcon name="more_horiz" classNames={[]} darkMode={false} />
                </button>
              </div>
            </div>
            {childs}
          </div>
        );
      };

      return categoryConverter(
        this.state.selectedTab == DocTypes.CategoryKind.Income
          ? this.props.doc.income.rootCategoryId
          : this.props.doc.outgo.rootCategoryId,
        0,
      );
    })();
    const categoryList = (
      <div id={this.elemIdCategoryList} className={Styles.CategoryList}>
        {rootCard}
      </div>
    );

    const modalDialog = ((): JSX.Element | null => {
      if (!this.state.modalState) {
        return null;
      }
      return (
        <CategoryEditDialog
          categoryKind={this.state.selectedTab}
          editCategoryId={this.state.editCategoryId}
          parentCategoryId={this.state.categoryIdForAddChild}
          onClosed={(isCanceled) => this.onCategoryEditDialogClosed(isCanceled)}
        />
      );
    })();

    const body = (
      <div className={Styles.BodyRoot}>
        <div className={Styles.Body}>
          {controlBar}
          {categoryList}
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

  private setupSortable() {
    const categories =
      this.state.selectedTab === DocTypes.CategoryKind.Income
        ? this.props.doc.income.categories
        : this.props.doc.outgo.categories;
    Object.keys(categories)
      .map((keyText) => Number(keyText))
      .forEach((id) => {
        const category = categories[id];
        if (category.childs.length === 0) {
          return;
        }
        const elem = document.getElementById(`${this.elemIdCategoryList}-${id}`);
        if (elem === null) {
          throw new Error();
        }
        Sortable.create(elem, {
          animation: 150,
          fallbackOnBody: true,
          ghostClass: Styles.CategoryCardGhost,
          group: this.sortedGroup,
          handle: `.${Styles.CategoryCardHeaderHandle}`,
          onEnd: (evt) => {
            // 値チェック
            if (evt.newIndex === undefined || evt.oldIndex === undefined) {
              throw new Error();
            }

            // 操作するカテゴリに関する情報をメモ
            const oldParentRegexpResult = evt.from.id.match(/-(\d+)$/);
            const newParentRegexpResult = evt.to.id.match(/-(\d+)$/);
            if (oldParentRegexpResult === null || newParentRegexpResult === null) {
              throw new Error();
            }
            const oldParentCategoryId = Number(oldParentRegexpResult[1]);
            const newParentCategoryId = Number(newParentRegexpResult[1]);
            const categories =
              this.state.selectedTab === DocTypes.CategoryKind.Income
                ? this.props.doc.income.categories
                : this.props.doc.outgo.categories;
            const categoryId = categories[oldParentCategoryId].childs[evt.oldIndex];

            // 移動
            Store.dispatch(
              DocActions.moveCategory(this.state.selectedTab, categoryId, newParentCategoryId, evt.newIndex),
            );

            // 自動保存リクエスト
            Store.dispatch(UiActions.documentRequestAutoSave());
          },
        });
      });
  }

  private onTabChanged(kind: DocTypes.CategoryKind) {
    this.setState({
      selectedTab: kind,
    });
  }

  private onCardActionBtnClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, id: number): void {
    e.stopPropagation();

    // カードアクションMenu作成
    const recordCountsDict = this.recordCountsDict();
    const isRootCategory = DocStateMethods.categoryById(this.props.doc, id).parent === null;
    this.cardActionMenu = new remote.Menu();
    this.cardActionMenu.append(
      new remote.MenuItem({
        label: '子カテゴリを作成...',
        enabled: !(id in recordCountsDict),
        click: () => {
          this.setState({ categoryIdForAddChild: id, modalState: ModalState.Add });
        },
      }),
    );
    this.cardActionMenu.append(
      new remote.MenuItem({
        label: '編集...',
        enabled: !isRootCategory,
        click: () => {
          this.setState({ editCategoryId: id, modalState: ModalState.Edit });
        },
      }),
    );
    this.cardActionMenu.append(
      new remote.MenuItem({
        label: '削除...',
        enabled: !isRootCategory,
        click: () => {
          this.categoryDelete();
        },
      }),
    );

    this.setState({ cardActionMenuActive: true });
    this.cardActionMenu.popup({
      callback: () => {
        this.setState({ cardActionMenuActive: false });
      },
    });
  }

  private onCategoryEditDialogClosed(isCanceled: boolean): void {
    // 後始末
    this.setState({
      editCategoryId: null,
      categoryIdForAddChild: null,
      modalState: ModalState.None,
    });
  }

  private categoryDelete() {
    // 値チェック
    if (this.state.editCategoryId === null) {
      throw new Error();
    }

    // 確認
    const recordCountsDict = this.recordCountsDict();
    const recordCount =
      this.state.editCategoryId in recordCountsDict ? recordCountsDict[this.state.editCategoryId] : null;
    const targetCategory = DocStateMethods.categoryById(this.props.doc, this.state.editCategoryId);
    const detailMessage = (() => {
      if (targetCategory.childs.length !== 0) {
        const totalRecordCount = DocStateMethods.leafCategoryIdArray(
          targetCategory.id,
          this.state.selectedTab === DocTypes.CategoryKind.Income
            ? this.props.doc.income.categories
            : this.props.doc.outgo.categories,
        )
          .map((id) => (id in recordCountsDict ? recordCountsDict[id] : 0))
          .reduce((prev, cur) => prev + cur, 0);
        if (totalRecordCount !== 0) {
          return `すべての子カテゴリと子カテゴリに紐付く ${totalRecordCount} 件のレコードは削除されます。`;
        }
        return `すべての子カテゴリは削除されます。`;
      }
      if (recordCount !== null) {
        return `カテゴリに紐付く ${recordCount} 件のレコードは削除されます。`;
      }
      return undefined;
    })();
    if (
      !NativeDialogUtils.showOkCancelDialog(
        'カテゴリの削除',
        `カテゴリ“${targetCategory.name}"を削除しますか？`,
        detailMessage,
        'カテゴリを削除',
      )
    ) {
      return;
    }

    // 削除を実行
    Store.dispatch(DocActions.deleteCategory(this.state.editCategoryId));
    Store.dispatch(UiActions.recordEditDialogUpdateLatestValue(null, null, null)); // 前回入力値情報をリセット

    // 自動保存
    Store.dispatch(UiActions.documentRequestAutoSave());
  }

  /// 各カテゴリが持つレコード数の辞書を返す。
  private recordCountsDict() {
    const recordExistsLeafCategories: { [key: number]: number } = {};
    const records =
      this.state.selectedTab === DocTypes.CategoryKind.Income
        ? this.props.doc.income.records
        : this.props.doc.outgo.records;
    const categoryIds = Object.values(records).map((record) => record.category);
    categoryIds.forEach((id) => {
      if (!(id in recordExistsLeafCategories)) {
        recordExistsLeafCategories[id] = 0;
      }
      ++recordExistsLeafCategories[id];
    });
    return recordExistsLeafCategories;
  }
}

const mapStateToProps = (state: IStoreState) => {
  return {
    doc: state.doc,
  };
};
export default ReactRedux.connect(mapStateToProps)(Category);
