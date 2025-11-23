import ClassNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as DocStates from 'src/state/doc/States';
import * as DocTypes from 'src/state/doc/Types';
import IStoreState from 'src/state/IStoreState';
import Store from 'src/state/Store';
import * as UiActions from 'src/state/ui/Actions';
import * as UiStates from 'src/state/ui/States';
import * as IYearMonthDayDateUtils from 'src/util/IYearMonthDayDateUtils';
import BasicStyles from 'src/view/Basic.css';
import LayoutStyles from 'src/view/Layout.css';
import MaterialIcon from 'src/view/widget/material-icon';
import RecordEditDialog from 'src/view/widget/record-edit-dialog';

import Styles from './Header.css';

interface IProps {
  doc: DocStates.IState;
  page: UiStates.IPageCalendar;
}

interface IState {
  modalRecordEdit: boolean; // レコード編集ダイアログ表示する場合に true を指定。
}

class Header extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      modalRecordEdit: false,
    };
  }

  public render() {
    const currentDateClass = ClassNames(Styles.CurrentDate);
    const movePrevBtnClass = ClassNames(BasicStyles.StdBtnPrimary, Styles.Btn, Styles.MoveBtn, Styles.MovePrevBtn);
    const moveTodayBtnClass = ClassNames(BasicStyles.StdBtnPrimary, Styles.Btn, Styles.MoveBtn);
    const moveNextBtnClass = ClassNames(BasicStyles.StdBtnPrimary, Styles.Btn, Styles.MoveBtn, Styles.MoveNextBtn);
    const viewUnitSelectClass = ClassNames(BasicStyles.StdSelect, Styles.ViewUnitSelect);
    // const jumpBtnClass = ClassNames(BasicStyles.StdBtnPrimary, Styles.Btn, Styles.JumpBtn);
    // const filterBtnClass = ClassNames(BasicStyles.IconBtn, Styles.Btn, Styles.FilterBtn);
    const rightAreaClass = ClassNames(LayoutStyles.RightToLeft, Styles.RightArea);
    const newRecordBtnClass = ClassNames(BasicStyles.IconBtn, Styles.Btn, Styles.NewRecordBtn);
    const iconClass = ClassNames('material-icons', 'md-16');
    let modalDialog: JSX.Element | null = null;
    if (this.state.modalRecordEdit) {
      modalDialog = (
        <RecordEditDialog
          formDefaultValue={{
            recordKind: DocTypes.RecordKind.Outgo,
            date: IYearMonthDayDateUtils.today(),
            accountId: null,
            categoryId: null,
          }}
          additionalRecords={[]}
          onClosed={() => {
            this.setState({ modalRecordEdit: false });
          }}
        />
      );
    }
    const currentDate = `${this.props.page.currentDate.year}年${this.props.page.currentDate.month}月`;
    return (
      <div className={Styles.Root}>
        <div className={Styles.Body}>
          <span className={currentDateClass}>{currentDate}</span>
          <button
            className={movePrevBtnClass}
            onClick={() => {
              this.onMovePrevBtnPushed();
            }}
          >
            <MaterialIcon name="chevron_left" classNames={[]} darkMode={true} />
          </button>
          <button
            className={moveTodayBtnClass}
            onClick={() => {
              this.onMoveTodayBtnPushed();
            }}
          >
            今月
          </button>
          <button
            className={moveNextBtnClass}
            onClick={() => {
              this.onMoveNextBtnPushed();
            }}
          >
            <MaterialIcon name="chevron_right" classNames={[]} darkMode={true} />
          </button>
          {/* <button className={jumpBtnClass} onClick={this.onJumpBtnPushed}>移動</button> */}
          <select
            className={viewUnitSelectClass}
            defaultValue="month"
            onChange={() => {
              this.onViewUnitChanged();
            }}
          >
            <option value="month">月表示</option>
          </select>
          {/* <button
            className={filterBtnClass}
            onClick={() => {
              this.onFilterBtnPushed();
            }}
            title={'フィルター（準備中）'}
          >
            <i className={iconClass}>filter_list</i>
          </button> */}
          <div className={rightAreaClass}>
            <button
              className={newRecordBtnClass}
              onClick={() => {
                this.onNewRecordBtnPushed();
              }}
            >
              <i className={iconClass}>note_add</i>
            </button>
            <div style={{ width: '100%' }} />
          </div>
          {modalDialog}
        </div>
      </div>
    );
  }

  private onViewUnitChanged() {
    global.console.log('onViewUnitChanged');
  }

  private onMovePrevBtnPushed() {
    Store.dispatch(UiActions.calendarMovePrev());
  }

  private onMoveTodayBtnPushed() {
    Store.dispatch(UiActions.calendarMoveToday());
  }

  private onMoveNextBtnPushed() {
    Store.dispatch(UiActions.calendarMoveNext());
  }

  private onJumpBtnPushed() {
    global.console.log('onJumpBtnPushed');
  }

  private onFilterBtnPushed() {
    global.console.log('onFilterBtnPushed');
  }

  private onNewRecordBtnPushed() {
    this.setState({ modalRecordEdit: true });
  }
}

const mapStateToProps = (state: IStoreState) => {
  return {
    doc: state.doc,
    page: state.ui.pageCalendar,
  };
};
export default ReactRedux.connect(mapStateToProps)(Header);
