import Clone from 'clone';
import DataAccount from '../../data-model/doc/Account';
import DataCategory from '../../data-model/doc/Category';
import DataRecordIncome from '../../data-model/doc/RecordIncome';
import DataRecordOutgo from '../../data-model/doc/RecordOutgo';
import DataRecordTransfer from '../../data-model/doc/RecordTransfer';
import DataRoot from '../../data-model/doc/Root';
import YearMonthDayDate from '../../util/YearMonthDayDate';
import * as States from './States';
import * as Types from './Types';

/** DataRoot から State を作成。 */
export const fromData = (src: DataRoot) => {
  // enum デシリアライズ
  const enumPraseAccountKind = (targetKey: string): Types.AccountKind => {
    for (const key in Types.AccountKind) {
      if (key === targetKey) {
        return (+Types.AccountKind[key]) as Types.AccountKind;
      }
    }
    throw new Error(`Error: Not found key named '${targetKey}'.`);
  };

  // 結果
  const r = Clone(States.defaultState);

  //  口座
  const accountIdDict: {[key: number]: number} = {}; // Data内Id → オブジェクトId 変換テーブル
  for (const data of src.accounts) {
    const kind = enumPraseAccountKind(data.kind);
    const key = accountAdd(r, data.name, kind, data.initialAmount);
    accountIdDict[data.id] = key;
  }

  // 出金
  {
      const categoryIdDict: {[key: number]: number} = {}; // Data内Id -> オブジェクトId 変換テーブル
      for (const data of src.outgo.categories) {
        let parentId = null;
        if (data.parent !== 0) {
          parentId = categoryIdDict[data.parent];
          if (parentId == null) {
              throw new Error(`Error: Invalid parent value(${data.parent}) in outgo category (id: '${data.id}').`);
          }
        }
        const key = outgoCategoryAdd(r, data.name, parentId);
        categoryIdDict[data.id] = key;
      }
      for (const data of src.outgo.records) {
        const categoryId = categoryIdDict[data.category];
        if (categoryId == null) {
            throw new Error(`Error: Invalid category value(${data.category}) in outgo record.`);
        }
        const accountId = accountIdDict[data.account];
        if (accountId == null) {
            throw new Error(`Error: Invalid account value(${data.account}) in outgo record.`);
        }
        outgoRecordAdd(
          r,
          new Date(data.createDate),
          new Date(data.updateDate),
          YearMonthDayDate.fromText(data.date),
          data.memo,
          accountId,
          categoryId,
          data.amount,
        );
      }
  }

  return r;
};

/** ドキュメントルートデータにエクスポート。 */
export const toData = (state: States.IState) => {
  // 結果オブジェクト
  const result = new DataRoot();

  // 口座
  for (const key in state.accounts) {
    if (!state.accounts.hasOwnProperty(key)) {
      continue;
    }
    const src = state.accounts[key];
    const data = new DataAccount();
    data.id = src.id;
    data.name = src.name;
    data.kind = Types.AccountKind[src.kind];
    result.accounts.push(data);
    data.initialAmount = src.initialAmount;
  }

  // 入金
  {
    // カテゴリ
    for (const key in state.income.categories) {
      if (!state.income.categories.hasOwnProperty(key)) {
        continue;
      }
      const src = state.income.categories[key];
      const data = new DataCategory();
      data.id = src.id;
      data.name = src.name;
      if (src.parent != null) {
        data.parent = src.parent;
      }
      result.income.categories.push(data);
    }

    // レコード
    for (const key in state.income.records) {
      if (!state.income.records.hasOwnProperty(key)) {
        continue;
      }
      const src = state.income.records[key];
      const data = new DataRecordIncome();
      data.createDate = src.createDate.toISOString();
      data.updateDate = src.updateDate.toISOString();
      data.date = src.date.toText();
      data.memo = src.memo;
      data.amount = src.amount;
      data.category = src.category;
      data.account = src.account;
      result.income.records.push(data);
    }
  }

  // 出金
  {
    // カテゴリ
    for (const key in state.outgo.categories) {
      if (!state.outgo.categories.hasOwnProperty(key)) {
        continue;
      }
      const src = state.outgo.categories[key];
      const data = new DataCategory();
      data.id = src.id;
      data.name = src.name;
      if (src.parent != null) {
        data.parent = src.parent;
      }
      result.outgo.categories.push(data);
    }

    // レコード
    for (const key in state.outgo.records) {
      if (!state.outgo.records.hasOwnProperty(key)) {
        continue;
      }
      const src = state.outgo.records[key];
      const data = new DataRecordOutgo();
      data.createDate = src.createDate.toISOString();
      data.updateDate = src.updateDate.toISOString();
      data.date = src.date.toText();
      data.memo = src.memo;
      data.amount = src.amount;
      data.category = src.category;
      data.account = src.account;
      result.outgo.records.push(data);
    }
  }

  // 送金
  {
    // レコード
    for (const key in state.transfer.records) {
      if (!state.transfer.records.hasOwnProperty(key)) {
        continue;
      }
      const src = state.transfer.records[key];
      const data = new DataRecordTransfer();
      data.createDate = src.createDate.toISOString();
      data.updateDate = src.updateDate.toISOString();
      data.date = src.date.toText();
      data.memo = src.memo;
      data.amount = src.amount;
      data.accountFrom = src.accountFrom;
      data.accountTo = src.accountTo;
      result.transfer.records.push(data);
    }
  }

  // 結果を返す
  return result;
};

/**
 * 口座追加。
 * @return {number} 追加した口座のId。
 */
export const accountAdd = (
  state: States.IState,
  name: string,
  kind: Types.AccountKind,
  initialAmount: number,
  ) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name,
    kind,
    initialAmount,
  };

  // 追加
  obj.id = state.nextId.account;
  state.nextId.account++;
  state.accounts[obj.id] = obj;
  return obj.id;
};


/// 入金カテゴリ追加。
/// @return {number} 追加したカテゴリの CategoryId。
export const incomeCategoryAdd = (
  state: States.IState,
  name: string,
  parentId: number | null,
  ) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name,
    parent: parentId,
    childs: [],
  };
  const parent = parentId != null ? state.income.categories[parentId] : null;

  // 追加
  obj.id = state.nextId.income.category;
  state.nextId.income.category++;
  state.income.categories[obj.id] = obj;
  if (parentId != null) {
    if (parent != null) {
      parent.childs.push(obj.id);
    } else {
      throw new Error(`Category parent (id: ${parentId}) is not exist.`);
    }
  }
  return obj.id;
};

/**
 * 入金レコードの追加。
 * @param amount 金額。(入金がプラス・出金がマイナス)
 */
export const incomeRecordAdd = (
  state: States.IState,
  createDate: Date,
  updateDate: Date,
  date: YearMonthDayDate,
  memo: string,
  accountId: number,
  categoryId: number,
  amount: number,
  ) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    createDate,
    updateDate,
    date,
    memo,
    account: accountId,
    category: categoryId,
    amount,
  };

  // 追加
  obj.id = state.nextId.income.record;
  state.nextId.income.record++;
  state.income.records[obj.id] = obj;
  return obj.id;
};


/// 出金カテゴリ追加。
/// @return {number} 追加したカテゴリの CategoryId。
export const outgoCategoryAdd = (
  state: States.IState,
  name: string,
  parentId: number | null,
  ) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name,
    parent: parentId,
    childs: [],
  };
  const parent = parentId != null ? state.outgo.categories[parentId] : null;

  // 追加
  obj.id = state.nextId.outgo.category;
  state.nextId.outgo.category++;
  state.outgo.categories[obj.id] = obj;
  if (parentId != null) {
    if (parent != null) {
      parent.childs.push(obj.id);
    } else {
      throw new Error(`Category parent (id: ${parentId}) is not exist.`);
    }
  }
  return obj.id;
};

/**
 * 出金レコードの追加。
 * @param amount 金額。(出金がプラス・入金がマイナス)
 */
export const outgoRecordAdd = (
  state: States.IState,
  createDate: Date,
  updateDate: Date,
  date: YearMonthDayDate,
  memo: string,
  accountId: number,
  categoryId: number,
  amount: number,
  ) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    createDate,
    updateDate,
    date,
    memo,
    account: accountId,
    category: categoryId,
    amount,
  };

  // 追加
  obj.id = state.nextId.outgo.record;
  state.nextId.outgo.record++;
  state.outgo.records[obj.id] = obj;
  return obj.id;
};

/**
 * 送金レコードの追加。
 * @param amount 金額。送金元口座からは減算され送金先口座に加算される。
 */
export const transferRecordAdd = (
  state: States.IState,
  createDate: Date,
  updateDate: Date,
  date: YearMonthDayDate,
  memo: string,
  accountFromId: number,
  accountToId: number,
  amount: number,
  ) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    createDate,
    updateDate,
    date,
    memo,
    accountFrom: accountFromId,
    accountTo: accountToId,
    amount,
  };

  // 追加
  obj.id = state.nextId.transfer.record;
  state.nextId.transfer.record++;
  state.transfer.records[obj.id] = obj;
  return obj.id;
};
