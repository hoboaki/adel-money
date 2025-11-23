import ClassNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as DocStates from 'src/state/doc/States';
import IStoreState from 'src/state/IStoreState';
import * as UiStates from 'src/state/ui/States';
import BalanceCalculator from 'src/util/doc/BalanceCalculator';
import RecordCollection from 'src/util/doc/RecordCollection';
import * as RecordFilters from 'src/util/doc/RecordFilters';
import * as IYearMonthDayDateUtils from 'src/util/IYearMonthDayDateUtils';
import * as PriceUtils from 'src/util/PriceUtils';

import Styles from './Balance.css';

interface IProps {
  doc: DocStates.IState;
  page: UiStates.IPageCalendar;
}

class Balance extends React.Component<IProps> {
  public render() {
    const startDate = this.props.page.currentDate;
    const endDate = IYearMonthDayDateUtils.nextMonth(startDate);

    const currentRecords = new RecordCollection(this.props.doc).filter([
      RecordFilters.createDateRangeFilter({ startDate, endDate }),
    ]);

    const incomeTotal = currentRecords.sumAmountIncome();
    const outgoTotal = currentRecords.sumAmountOutgo();
    const balanceTotal = incomeTotal - outgoTotal;
    const transferDiff = currentRecords.totalDiffTransfer();
    const closingPrice = new BalanceCalculator(this.props.doc, endDate).sumBalance();
    const incomeTotalText = `${incomeTotal < 0 ? '▲ ' : ''}` + `${PriceUtils.numToLocaleString(Math.abs(incomeTotal))}`;
    const outgoTotalText = `${outgoTotal < 0 ? '△ ' : ''}` + `${PriceUtils.numToLocaleString(Math.abs(outgoTotal))}`;
    const balanceSignText = balanceTotal < 0 ? '-' : 0 < balanceTotal ? '+' : '';
    const balanceTotalText = balanceSignText + `${PriceUtils.numToLocaleString(Math.abs(balanceTotal))}`;
    const transferDiffText = `${PriceUtils.numToLocaleString(transferDiff)}`;
    const closingPriceText = `${PriceUtils.numToLocaleString(closingPrice)}`;

    const rootClass = ClassNames(Styles.Root);
    const spacerClass = ClassNames(Styles.Spacer);
    const tableClass = ClassNames(Styles.Table);
    const tableHeaderLabelClass = ClassNames(Styles.TableHeader, Styles.TableHeaderLabel);
    const tableHeaderSpacerClass = ClassNames(Styles.TableHeader, Styles.TableHeaderSpacer);
    const tableDataValueClass = ClassNames(Styles.TableData, Styles.TableDataValue);
    const tableDataBalanceValueClass = ClassNames(
      Styles.TableData,
      Styles.TableDataValue,
      balanceTotal < 0 ? Styles.TableDataValueDeficit : null,
      0 < balanceTotal ? Styles.TableDataValueSurplus : null,
    );
    const tableDataSignClass = ClassNames(Styles.TableData, Styles.TableDataSign);
    return (
      <div className={rootClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={tableHeaderLabelClass}>当月収入 (¥)</th>
              <th className={tableHeaderSpacerClass}></th>
              <th className={tableHeaderLabelClass}>当月支出 (¥)</th>
              <th className={tableHeaderSpacerClass}></th>
              <th className={tableHeaderLabelClass}>当月収支 (¥)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tableDataValueClass}>{incomeTotalText}</td>
              <td className={tableDataSignClass}>-</td>
              <td className={tableDataValueClass}>{outgoTotalText}</td>
              <td className={tableDataSignClass}>=</td>
              <td className={tableDataBalanceValueClass}>{balanceTotalText}</td>
            </tr>
          </tbody>
        </table>
        <div className={spacerClass} />
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={tableHeaderLabelClass}>当月振替差額 (¥)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tableDataValueClass}>{transferDiffText}</td>
            </tr>
          </tbody>
        </table>
        <div className={spacerClass} />
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={tableHeaderLabelClass}>当月末残高 (¥)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tableDataValueClass}>{closingPriceText}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

const mapStateToProps = (state: IStoreState) => {
  return {
    doc: state.doc,
    page: state.ui.pageCalendar,
  };
};
export default ReactRedux.connect(mapStateToProps)(Balance);
