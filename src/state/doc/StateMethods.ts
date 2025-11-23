import Clone from 'clone';
import DataAggregateAccount from 'src/data-model/doc/AggregateAccount';
import DataAccount from 'src/data-model/doc/BasicAccount';
import DataCategory from 'src/data-model/doc/Category';
import DataRecordIncome from 'src/data-model/doc/IncomeRecord';
import DataRecordOutgo from 'src/data-model/doc/OutgoRecord';
import DataPalmCategoryInfo from 'src/data-model/doc/PalmCategoryInfo';
import DataRoot from 'src/data-model/doc/Root';
import DataRecordTransfer from 'src/data-model/doc/TransferRecord';
import IYearMonthDayDate from 'src/util/IYearMonthDayDate';
import * as IYearMonthDayDateUtils from 'src/util/IYearMonthDayDateUtils';

import * as States from './States';
import * as Types from './Types';

/** DataRoot から State を作成。 */
export const fromData = (src: DataRoot) => {
  // enum デシリアライズ
  const enumPraseAccountKind = (targetKey: string): Types.BasicAccountKind => {
    for (const key in Types.BasicAccountKind) {
      if (key === targetKey) {
        return +Types.BasicAccountKind[key] as Types.BasicAccountKind;
      }
    }
    throw new Error(`Error: Not found key named '${targetKey}'.`);
  };

  // 結果
  const r = Clone(States.defaultState);

  // 基本口座
  const basicAccountIdDict: { [key: number]: number } = {}; // Data内Id → オブジェクトId 変換テーブル
  for (const data of src.accounts) {
    const kind = enumPraseAccountKind(data.kind);
    const key = basicAccountAdd(
      r,
      data.name,
      kind,
      data.initialAmount,
      IYearMonthDayDateUtils.fromText(data.startDate),
    );
    basicAccountIdDict[data.id] = key;
  }

  // 集計口座
  for (const data of src.aggregateAccounts) {
    aggregateAccountAdd(
      r,
      data.name,
      data.accounts.map((accountId) => basicAccountIdDict[accountId]),
    );
  }

  // 入金
  const incomeCategoryIdDict: { [key: number]: number } = {}; // Data内Id -> オブジェクトId 変換テーブル
  {
    const categoryIdDict = incomeCategoryIdDict;
    for (const data of src.income.categories) {
      let parentId = null;
      if (data.parent !== 0) {
        parentId = categoryIdDict[data.parent];
        if (parentId == null) {
          throw new Error(`Error: Invalid parent value(${data.parent}) in income category (id: '${data.id}').`);
        }
      }
      const key = incomeCategoryAdd(r, data.name, parentId);
      if (data.collapse) {
        categoryCollapsedStateUpdate(r, key, true);
      }
      categoryIdDict[data.id] = key;
    }
    for (const data of src.income.records) {
      const categoryId = categoryIdDict[data.category];
      if (categoryId == null) {
        throw new Error(`Error: Invalid category value(${data.category}) in income record.`);
      }
      const accountId = basicAccountIdDict[data.account];
      if (accountId == null) {
        throw new Error(`Error: Invalid account value(${data.account}) in income record.`);
      }
      incomeRecordAdd(
        r,
        new Date(data.createDate),
        new Date(data.updateDate),
        IYearMonthDayDateUtils.fromText(data.date),
        data.memo,
        accountId,
        categoryId,
        data.amount,
      );
    }
  }

  // 出金
  const outgoCategoryIdDict: { [key: number]: number } = {}; // Data内Id -> オブジェクトId 変換テーブル
  {
    const categoryIdDict = outgoCategoryIdDict;
    for (const data of src.outgo.categories) {
      let parentId = null;
      if (data.parent !== 0) {
        parentId = categoryIdDict[data.parent];
        if (parentId == null) {
          throw new Error(`Error: Invalid parent value(${data.parent}) in outgo category (id: '${data.id}').`);
        }
      }
      const key = outgoCategoryAdd(r, data.name, parentId);
      if (data.collapse) {
        categoryCollapsedStateUpdate(r, key, true);
      }
      categoryIdDict[data.id] = key;
    }
    for (const data of src.outgo.records) {
      const categoryId = categoryIdDict[data.category];
      if (categoryId == null) {
        throw new Error(`Error: Invalid category value(${data.category}) in outgo record.`);
      }
      const accountId = basicAccountIdDict[data.account];
      if (accountId == null) {
        throw new Error(`Error: Invalid account value(${data.account}) in outgo record.`);
      }
      outgoRecordAdd(
        r,
        new Date(data.createDate),
        new Date(data.updateDate),
        IYearMonthDayDateUtils.fromText(data.date),
        data.memo,
        accountId,
        categoryId,
        data.amount,
      );
    }
  }

  // 送金
  {
    for (const data of src.transfer.records) {
      const accountFromId = basicAccountIdDict[data.accountFrom];
      if (accountFromId == null) {
        throw new Error(`Error: Invalid account value(${data.accountFrom}) in transfer record.`);
      }
      const accountToId = basicAccountIdDict[data.accountTo];
      if (accountToId == null) {
        throw new Error(`Error: Invalid account value(${data.accountTo}) in transfer record.`);
      }
      transferRecordAdd(
        r,
        new Date(data.createDate),
        new Date(data.updateDate),
        IYearMonthDayDateUtils.fromText(data.date),
        data.memo,
        accountFromId,
        accountToId,
        data.amount,
      );
    }
  }

  // Palmカテゴリデータ
  src.importTool.palmCategories.income.forEach((data) => {
    palmCategoryInfoIncomeAdd(
      r,
      data.name,
      data.account === 0 ? Types.INVALID_ID : basicAccountIdDict[data.account],
      data.category === 0 ? Types.INVALID_ID : incomeCategoryIdDict[data.category],
    );
  });
  src.importTool.palmCategories.outgo.forEach((data) => {
    palmCategoryInfoOutgoAdd(
      r,
      data.name,
      data.account === 0 ? Types.INVALID_ID : basicAccountIdDict[data.account],
      data.category === 0 ? Types.INVALID_ID : outgoCategoryIdDict[data.category],
    );
  });

  return r;
};

/** ドキュメントルートデータにエクスポート。 */
export const toData = (state: States.IState) => {
  // 結果オブジェクト
  const result = new DataRoot();

  // 資産口座・負債口座
  const basicAccountIdDict: { [key: number]: number } = {}; // AccountId -> エクスポート先のId 辞書
  const basicAccountProcess = (account: States.IBasicAccount) => {
    const src = account;
    const data = new DataAccount();
    data.id = result.accounts.length + 1;
    data.name = src.name;
    data.kind = Types.BasicAccountKind[src.kind];
    data.initialAmount = src.initialAmount;
    data.startDate = IYearMonthDayDateUtils.toDataFormatText(src.startDate);
    result.accounts.push(data);
    basicAccountIdDict[src.id] = data.id;
  };
  state.assetsAccount.order.forEach((key) => {
    basicAccountProcess(state.assetsAccount.accounts[key]);
  });
  state.liabilitiesAccount.order.forEach((key) => {
    basicAccountProcess(state.liabilitiesAccount.accounts[key]);
  });

  // 集計口座
  state.aggregateAccount.order.forEach((id) => {
    const src = state.aggregateAccount.accounts[id];
    const data = new DataAggregateAccount();
    data.id = result.aggregateAccounts.length + 1;
    data.name = src.name;
    data.accounts = src.accounts.map((accountId) => basicAccountIdDict[accountId]);
    result.aggregateAccounts.push(data);
  });

  // 入金
  const incomeCategoryIdDict: { [key: number]: number } = {}; // CategoryId -> エクスポート先のId 辞書
  {
    // カテゴリ
    const categoryIdDict = incomeCategoryIdDict;
    const collectChildCategoryId = (ids: number[]): number[] => {
      return ids.reduce((resultIds: number[], id: number) => {
        resultIds.push(id);
        const childs = state.income.categories[id].childs;
        if (childs.length !== 0) {
          resultIds = resultIds.concat(collectChildCategoryId(childs));
        }
        return resultIds;
      }, []);
    };
    const categoryOrder = collectChildCategoryId([state.income.rootCategoryId]);
    categoryOrder.forEach((key) => {
      const src = state.income.categories[key];
      const data = new DataCategory();
      data.id = result.income.categories.length + 1;
      data.name = src.name;
      data.collapse = src.collapse;
      if (src.parent != null) {
        data.parent = categoryIdDict[src.parent];
        if (data.parent === 0 || data.parent === undefined) {
          throw new Error('Not found income category parent id.');
        }
      }
      result.income.categories.push(data);
      categoryIdDict[src.id] = data.id;
    });

    // レコード
    for (const key in state.income.records) {
      // eslint-disable-next-line no-prototype-builtins
      if (!state.income.records.hasOwnProperty(key)) {
        continue;
      }
      const src = state.income.records[key];
      const data = new DataRecordIncome();
      data.createDate = src.createDate.toISOString();
      data.updateDate = src.updateDate.toISOString();
      data.date = IYearMonthDayDateUtils.toDataFormatText(src.date);
      data.memo = src.memo;
      data.amount = src.amount;
      data.category = categoryIdDict[src.category];
      data.account = basicAccountIdDict[src.account];
      result.income.records.push(data);
    }
  }

  // 出金
  const outgoCategoryIdDict: { [key: number]: number } = {}; // CategoryId -> エクスポート先のId 辞書
  {
    // カテゴリ
    const categoryIdDict = outgoCategoryIdDict;
    const collectChildCategoryId = (ids: number[]): number[] => {
      return ids.reduce((resultIds: number[], id: number) => {
        resultIds.push(id);
        const childs = state.outgo.categories[id].childs;
        if (childs.length !== 0) {
          resultIds = resultIds.concat(collectChildCategoryId(childs));
        }
        return resultIds;
      }, []);
    };
    const categoryOrder = collectChildCategoryId([state.outgo.rootCategoryId]);
    categoryOrder.forEach((key) => {
      const src = state.outgo.categories[key];
      const data = new DataCategory();
      data.id = result.outgo.categories.length + 1;
      data.name = src.name;
      data.collapse = src.collapse;
      if (src.parent != null) {
        data.parent = categoryIdDict[src.parent];
        if (data.parent === 0 || data.parent === undefined) {
          throw new Error('Not found outgo category parent id.');
        }
      }
      result.outgo.categories.push(data);
      categoryIdDict[src.id] = data.id;
    });

    // レコード
    for (const key in state.outgo.records) {
      // eslint-disable-next-line no-prototype-builtins
      if (!state.outgo.records.hasOwnProperty(key)) {
        continue;
      }
      const src = state.outgo.records[key];
      const data = new DataRecordOutgo();
      data.createDate = src.createDate.toISOString();
      data.updateDate = src.updateDate.toISOString();
      data.date = IYearMonthDayDateUtils.toDataFormatText(src.date);
      data.memo = src.memo;
      data.amount = src.amount;
      data.category = categoryIdDict[src.category];
      data.account = basicAccountIdDict[src.account];
      result.outgo.records.push(data);
    }
  }

  // 送金
  {
    // レコード
    for (const key in state.transfer.records) {
      // eslint-disable-next-line no-prototype-builtins
      if (!state.transfer.records.hasOwnProperty(key)) {
        continue;
      }
      const src = state.transfer.records[key];
      const data = new DataRecordTransfer();
      data.createDate = src.createDate.toISOString();
      data.updateDate = src.updateDate.toISOString();
      data.date = IYearMonthDayDateUtils.toDataFormatText(src.date);
      data.memo = src.memo;
      data.amount = src.amount;
      data.accountFrom = basicAccountIdDict[src.accountFrom];
      data.accountTo = basicAccountIdDict[src.accountTo];
      result.transfer.records.push(data);
    }
  }

  // Palmカテゴリ情報
  Object.keys(state.importTool.palmCategories.income)
    .sort()
    .forEach((key) => {
      // eslint-disable-next-line no-prototype-builtins
      if (!state.importTool.palmCategories.income.hasOwnProperty(key)) {
        return;
      }
      const src = state.importTool.palmCategories.income[key];
      const data = new DataPalmCategoryInfo();
      data.name = key;
      if (src.account !== Types.INVALID_ID) {
        data.account = basicAccountIdDict[src.account];
      }
      if (src.category !== Types.INVALID_ID) {
        data.category = incomeCategoryIdDict[src.category];
      }
      result.importTool.palmCategories.income.push(data);
    });
  Object.keys(state.importTool.palmCategories.outgo)
    .sort()
    .forEach((key) => {
      // eslint-disable-next-line no-prototype-builtins
      if (!state.importTool.palmCategories.outgo.hasOwnProperty(key)) {
        return;
      }
      const src = state.importTool.palmCategories.outgo[key];
      const data = new DataPalmCategoryInfo();
      data.name = key;
      if (src.account !== Types.INVALID_ID) {
        data.account = basicAccountIdDict[src.account];
      }
      if (src.category !== Types.INVALID_ID) {
        data.category = outgoCategoryIdDict[src.category];
      }
      result.importTool.palmCategories.outgo.push(data);
    });

  // 結果を返す
  return result;
};

/**
 * 基本口座追加。
 * @return {number} 追加した口座のId。
 */
export const basicAccountAdd = (
  state: States.IState,
  name: string,
  kind: Types.BasicAccountKind,
  initialAmount: number,
  startDate: IYearMonthDayDate,
) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name,
    kind,
    initialAmount,
    startDate,
  };

  // 追加
  const accountGroup = Types.basicAccountKindToAccountKind(kind);
  obj.id = state.nextId.account;
  state.nextId.account++;
  switch (accountGroup) {
    case Types.AccountKind.Assets:
      state.assetsAccount.accounts[obj.id] = obj;
      state.assetsAccount.order.push(obj.id);
      break;
    case Types.AccountKind.Liabilities:
      state.liabilitiesAccount.accounts[obj.id] = obj;
      state.liabilitiesAccount.order.push(obj.id);
      break;
    default:
      throw new Error();
      break;
  }

  return obj.id;
};

/**
 * 基本口座更新。
 */
export const basicAccountUpdate = (
  state: States.IState,
  accountId: number,
  name: string,
  kind: Types.BasicAccountKind,
  initialAmount: number,
  startDate: IYearMonthDayDate,
) => {
  const obj = {
    id: accountId,
    name,
    kind,
    initialAmount,
    startDate,
  };
  const accountGroup = Types.basicAccountKindToAccountKind(kind);
  switch (accountGroup) {
    case Types.AccountKind.Assets:
      global.console.assert(accountId in state.assetsAccount.accounts);
      state.assetsAccount.accounts[accountId] = obj;
      break;
    case Types.AccountKind.Liabilities:
      global.console.assert(accountId in state.liabilitiesAccount.accounts);
      state.liabilitiesAccount.accounts[accountId] = obj;
      break;
    default:
      throw new Error();
  }
  return obj.id;
};

/** 資産口座と負債口座を結合した IBasicAccount 配列を取得。 */
export const basicAccounts = (state: States.IState): { [key: number]: States.IBasicAccount } => {
  return Object.assign(state.assetsAccount.accounts, state.liabilitiesAccount.accounts);
};

/** 資産口座と負債口座のそれぞれの並び順を結合した AccountId 配列を取得。 */
export const basicAccountOrderMixed = (state: States.IState): number[] => {
  return state.assetsAccount.order.concat(state.liabilitiesAccount.order);
};

/**
 * 集計口座追加。
 * @return {number} 追加した集計口座のId。
 */
export const aggregateAccountAdd = (state: States.IState, name: string, accounts: number[]) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name,
    accounts,
  };

  // 対象の口座があるかチェック
  const localBasicAccounts = basicAccounts(state);
  if (accounts.filter((id) => id in localBasicAccounts).length !== accounts.length) {
    throw new Error('Include not exists account id on aggregateAccountAdd().');
  }

  // 追加
  obj.id = state.nextId.account;
  state.nextId.account++;
  state.aggregateAccount.accounts[obj.id] = obj;
  state.aggregateAccount.order.push(obj.id);
  return obj.id;
};

/**
 * 集計口座更新。
 */
export const aggregateAccountUpdate = (state: States.IState, accountId: number, name: string, accounts: number[]) => {
  // オブジェクト作成
  const obj = {
    id: accountId,
    name,
    accounts,
  };

  // 対象の口座があるかチェック
  const localBasicAccounts = basicAccounts(state);
  if (accounts.filter((id) => id in localBasicAccounts).length !== accounts.length) {
    throw new Error('Include not exists account id on aggregateAccountUpdate().');
  }

  // 追加
  global.console.assert(obj.id in state.aggregateAccount.accounts);
  state.aggregateAccount.accounts[obj.id] = obj;
  return obj.id;
};

/**
 * 口座の順番の変更。
 * @param accountKind 変更対象となる口座タイプ。
 * @param oldIndex 移動する口座のインデックス値。
 * @param newIndex 移動後のインデックス値。
 */
export const accountOrderUpdate = (
  state: States.IState,
  accountKind: Types.AccountKind,
  oldIndex: number,
  newIndex: number,
) => {
  let orders = [];
  switch (accountKind) {
    case Types.AccountKind.Assets:
      orders = state.assetsAccount.order;
      break;
    case Types.AccountKind.Liabilities:
      orders = state.liabilitiesAccount.order;
      break;
    case Types.AccountKind.Aggregate:
      orders = state.aggregateAccount.order;
      break;
    default:
      throw new Error();
  }
  const moveId = orders[oldIndex];
  orders.splice(oldIndex, 1);
  orders.splice(newIndex, 0, moveId);
};

/**
 * 口座削除。
 */
export const accountDelete = (state: States.IState, accountId: number) => {
  // 口座に紐付くレコードを削除
  {
    let records: number[] = [];
    records = records.concat(
      Object.keys(state.income.records)
        .map((textId) => Number(textId))
        .filter((id) => state.income.records[id].account === accountId),
    );
    records = records.concat(
      Object.keys(state.outgo.records)
        .map((textId) => Number(textId))
        .filter((id) => state.outgo.records[id].account === accountId),
    );
    records = records.concat(
      Object.keys(state.transfer.records)
        .map((textId) => Number(textId))
        .filter((id) => {
          const record = state.transfer.records[id];
          return record.accountFrom === accountId || record.accountTo === accountId;
        }),
    );
    deleteRecords(state, records);
  }

  // 集計口座から対象を外す
  state.aggregateAccount.order.forEach((id) => {
    const account = state.aggregateAccount.accounts[id];
    account.accounts = account.accounts.filter((targetId) => targetId != accountId);
  });

  // 口座自体の削除
  state.assetsAccount.order = state.assetsAccount.order.filter((id) => id !== accountId);
  state.liabilitiesAccount.order = state.liabilitiesAccount.order.filter((id) => id !== accountId);
  state.aggregateAccount.order = state.aggregateAccount.order.filter((id) => id !== accountId);
  if (accountId in state.assetsAccount.accounts) {
    delete state.assetsAccount.accounts[accountId];
  }
  if (accountId in state.liabilitiesAccount.accounts) {
    delete state.liabilitiesAccount.accounts[accountId];
  }
  if (accountId in state.aggregateAccount.accounts) {
    delete state.aggregateAccount.accounts[accountId];
  }
};

/** 指定の名前の基本口座オブジェクトを取得。見つからなければエラー。 */
export const basicAccountByName = (state: States.IState, name: string): States.IBasicAccount => {
  const accounts = basicAccounts(state);
  const account = Object.values(accounts).find((ac) => ac.name === name);
  if (account === undefined) {
    global.console.log(accounts);
    throw new Error(`Not found account named '${name}'.`);
  }
  return account;
};

/** AccountKind に対応した並び順を AccountId 配列として取得する。 */
export const accountOrder = (state: States.IState, accountKind: Types.AccountKind) => {
  switch (accountKind) {
    case Types.AccountKind.Assets:
      return state.assetsAccount.order;
    case Types.AccountKind.Liabilities:
      return state.liabilitiesAccount.order;
    case Types.AccountKind.Aggregate:
      return state.aggregateAccount.order;
    default:
      throw new Error(`Invalid accountKind '${accountKind}.`);
  }
};

/** 指定の AccountId に対応する IAccount オブジェクトを取得する。見つからなければエラー。 */
export const accountById = (state: States.IState, accountId: number) => {
  if (accountId in state.assetsAccount.accounts) {
    return state.assetsAccount.accounts[accountId];
  }
  if (accountId in state.liabilitiesAccount.accounts) {
    return state.liabilitiesAccount.accounts[accountId];
  }
  if (accountId in state.aggregateAccount.accounts) {
    return state.aggregateAccount.accounts[accountId];
  }
  throw new Error(`Not found account (id: ${accountId}).`);
};

/// 入金カテゴリ追加。
/// @return {number} 追加したカテゴリの CategoryId。
export const incomeCategoryAdd = (state: States.IState, name: string, parentId: number | null) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name: parentId == null ? '' : name,
    parent: parentId,
    childs: [],
    collapse: false,
  };
  const parent = parentId != null ? state.income.categories[parentId] : null;

  // ルート要素なら１つ目であることを保証
  if (parent == null && Object.keys(state.income.categories).length !== 0) {
    throw new Error('Income root category is already exists.');
  }

  // 追加
  obj.id = state.nextId.category;
  state.nextId.category++;
  state.income.categories[obj.id] = obj;
  if (parentId != null) {
    if (parent != null) {
      parent.childs.push(obj.id);
    } else {
      throw new Error(`Category parent (id: ${parentId}) is not exist.`);
    }
  }

  // ルートの場合は ID を記録
  if (parent == null) {
    state.income.rootCategoryId = obj.id;
  }

  return obj.id;
};

/// 出金カテゴリ追加。
/// @return {number} 追加したカテゴリの CategoryId。
export const outgoCategoryAdd = (state: States.IState, name: string, parentId: number | null) => {
  // オブジェクト作成
  const obj = {
    id: 0,
    name: parentId == null ? '' : name,
    parent: parentId,
    childs: [],
    collapse: false,
  };
  const parent = parentId != null ? state.outgo.categories[parentId] : null;

  // ルート要素なら１つ目であることを保証
  if (parent == null && Object.keys(state.outgo.categories).length !== 0) {
    throw new Error('Outgo root category is already exists.');
  }

  // 追加
  obj.id = state.nextId.category;
  state.nextId.category++;
  state.outgo.categories[obj.id] = obj;
  if (parentId != null) {
    if (parent != null) {
      parent.childs.push(obj.id);
    } else {
      throw new Error(`Category parent (id: ${parentId}) is not exist.`);
    }
  }

  // ルートの場合は ID を記録
  if (parent == null) {
    state.outgo.rootCategoryId = obj.id;
  }

  return obj.id;
};

/// カテゴリ追加。
/// @return {number} 追加したカテゴリの CategoryId。
export const categoryAdd = (state: States.IState, kind: Types.CategoryKind, name: string, parentId: number | null) => {
  switch (kind) {
    case Types.CategoryKind.Income:
      return incomeCategoryAdd(state, name, parentId);
    case Types.CategoryKind.Outgo:
      return outgoCategoryAdd(state, name, parentId);
    default:
      throw new Error(`Category kind (${kind}) is invalid.`);
  }
};

/// カテゴリ更新。
export const categoryUpdate = (state: States.IState, categoryId: number, name: string) => {
  categoryById(state, categoryId).name = name;
};

/**
 * カテゴリの移動。
 * @param categoryId 移動するカテゴリ。
 * @param newParentId 移動後の親カテゴリ。
 * @param newChildIndex 移動後の親カテゴリからみた子インデックス値。
 */
export const categoryMove = (
  state: States.IState,
  categoryKind: Types.CategoryKind,
  categoryId: number,
  newParentId: number,
  newChildIndex: number,
) => {
  const categories = categoryKind === Types.CategoryKind.Income ? state.income.categories : state.outgo.categories;
  global.console.assert(categoryId in categories);
  const category = categories[categoryId];
  const oldParentId = category.parent;
  if (oldParentId === null) {
    throw new Error();
  }
  const oldParent = categories[oldParentId];
  oldParent.childs = oldParent.childs.filter((id) => id !== categoryId);
  global.console.assert(newParentId in categories);
  const newParent = categories[newParentId];
  newParent.childs.splice(newChildIndex, 0, categoryId);
  category.parent = newParentId;
};

/**
 * カテゴリ削除。
 */
export const categoryDelete = (state: States.IState, categoryId: number) => {
  // 子供がいる場合は先に子供を削除
  const isIncome = categoryId in state.income.categories;
  const targetCategories = isIncome ? state.income.categories : state.outgo.categories;
  const targetCategory = targetCategories[categoryId];
  targetCategory.childs.forEach((id) => {
    categoryDelete(state, id);
  });
  global.console.assert(targetCategory.childs.length === 0);

  // カテゴリに紐付くレコードを削除
  {
    const targetRecords = isIncome ? state.income.records : state.outgo.records;
    const records: number[] = Object.keys(targetRecords)
      .map((textId) => Number(textId))
      .filter((id) => targetRecords[id].category === categoryId);
    deleteRecords(state, records);
  }

  // カテゴリ自体の削除
  if (targetCategory.parent === null || targetCategory.parent === Types.INVALID_ID) {
    throw new Error();
  }
  const parentCategory = targetCategories[targetCategory.parent];
  parentCategory.childs = parentCategory.childs.filter((id) => id !== categoryId);
  delete targetCategories[categoryId];
};

/** カテゴリの展開状態の更新。 */
export const categoryCollapsedStateUpdate = (state: States.IState, categoryId: number, isCollapsed: boolean) => {
  {
    const cat = state.income.categories[categoryId];
    if (cat != null) {
      cat.collapse = isCollapsed;
    }
  }
  {
    const cat = state.outgo.categories[categoryId];
    if (cat != null) {
      cat.collapse = isCollapsed;
    }
  }
};

/** 指定の CategoryId に対応する ICategory オブジェクトを取得する。見つからなければエラー。 */
export const categoryById = (state: States.IState, categoryId: number) => {
  if (categoryId in state.income.categories) {
    return state.income.categories[categoryId];
  }
  if (categoryId in state.outgo.categories) {
    return state.outgo.categories[categoryId];
  }
  throw new Error(`Not found category (id: ${categoryId}).`);
};

/**
 * 入金レコードの追加。
 * @param amount 金額。(入金がプラス・出金がマイナス)
 */
export const incomeRecordAdd = (
  state: States.IState,
  createDate: Date,
  updateDate: Date,
  date: IYearMonthDayDate,
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
  obj.id = state.nextId.record;
  state.nextId.record++;
  state.income.records[obj.id] = obj;
  return obj.id;
};

/**
 * 入金レコードの更新。
 */
export const incomeRecordUpdate = (
  state: States.IState,
  recordId: number,
  createDate: Date,
  updateDate: Date,
  date: IYearMonthDayDate,
  memo: string,
  accountId: number,
  categoryId: number,
  amount: number,
) => {
  // オブジェクト作成
  const obj = {
    id: recordId,
    createDate,
    updateDate,
    date,
    memo,
    account: accountId,
    category: categoryId,
    amount,
  };

  // 更新
  state.income.records[obj.id] = obj;
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
  date: IYearMonthDayDate,
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
  obj.id = state.nextId.record;
  state.nextId.record++;
  state.outgo.records[obj.id] = obj;
  return obj.id;
};

/**
 * 出金レコードの更新。
 */
export const outgoRecordUpdate = (
  state: States.IState,
  recordId: number,
  createDate: Date,
  updateDate: Date,
  date: IYearMonthDayDate,
  memo: string,
  accountId: number,
  categoryId: number,
  amount: number,
) => {
  // オブジェクト作成
  const obj = {
    id: recordId,
    createDate,
    updateDate,
    date,
    memo,
    account: accountId,
    category: categoryId,
    amount,
  };

  // 更新
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
  date: IYearMonthDayDate,
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
  obj.id = state.nextId.record;
  state.nextId.record++;
  state.transfer.records[obj.id] = obj;
  return obj.id;
};

/**
 * 送金レコードの更新。
 */
export const transferRecordUpdate = (
  state: States.IState,
  recordId: number,
  createDate: Date,
  updateDate: Date,
  date: IYearMonthDayDate,
  memo: string,
  accountFromId: number,
  accountToId: number,
  amount: number,
) => {
  // オブジェクト作成
  const obj = {
    id: recordId,
    createDate,
    updateDate,
    date,
    memo,
    accountFrom: accountFromId,
    accountTo: accountToId,
    amount,
  };

  // 追加
  state.transfer.records[obj.id] = obj;
  return obj.id;
};

/**
 * レコードの削除。
 */
export const deleteRecords = (state: States.IState, recordIdArray: number[]) => {
  recordIdArray.forEach((id) => {
    if (id in state.income.records) {
      delete state.income.records[id];
    }
    if (id in state.outgo.records) {
      delete state.outgo.records[id];
    }
    if (id in state.transfer.records) {
      delete state.transfer.records[id];
    }
  });
};

/**
 * パス形式文字列でカテゴリを検索し ICategory オブジェクトで返す。見つからない場合はエラー。
 * @param categories incomeCategories もしくは outgoCategories の参照。
 * @param path 階層をスラッシュで区切った文字列。（例：'家事費/食費'）
 */
export const categoryByPath = (categories: { [key: number]: States.ICategory }, path: string) => {
  // 引数チェック
  if (path === '') {
    throw new Error("Argument named 'path' is empty.");
  }

  // スラッシュでパスを分解して検索
  const names = path.split('/');
  let parentId = 0;
  names.forEach((name) => {
    const cats =
      parentId === 0
        ? Object.keys(categories)
            .filter((cat) => categories[Number(cat)].parent == null)
            .map((cat) => categories[Number(cat)])[0].childs
        : categories[parentId].childs;
    const nextId = cats.find((catId) => categories[catId].name === name);
    if (nextId === undefined) {
      global.console.log(`Finding '${name}' from parentId '${parentId}'.`);
      global.console.log(names);
      global.console.log(categories);
      throw new Error(`Not found category path '${path}'.`);
    }
    parentId = nextId;
  });
  return categories[parentId];
};

/** 指定のカテゴリID から検索を開始し最初に見つかる末端カテゴリの ID を返す。見つからない場合はエラー。 */
export const firstLeafCategoryId = (startCategoryId: number, categories: { [key: number]: States.ICategory }) => {
  let id = startCategoryId;
  while (categories[id].childs.length !== 0) {
    id = categories[id].childs[0];
  }
  return id;
};

/** ソート済カテゴリID配列を取得。 */
export const categoryIdArray = (startCategoryId: number, categories: { [key: number]: States.ICategory }) => {
  const result = new Array<number>();
  const proc = (categoryId: number) => {
    const cat = categories[categoryId];
    result.push(cat.id);
    cat.childs.forEach((childId) => {
      proc(childId);
    });
  };
  proc(startCategoryId);
  return result;
};

/** 指定のカテゴリ以下に所属する末端カテゴリID配列を取得。 */
export const leafCategoryIdArray = (targetCategoryId: number, categories: { [key: number]: States.ICategory }) => {
  const result = new Array<number>();
  const proc = (categoryId: number) => {
    const cat = categories[categoryId];
    if (cat.childs.length === 0) {
      result.push(categoryId);
    } else {
      cat.childs.forEach((childId) => {
        proc(childId);
      });
    }
  };
  proc(targetCategoryId);
  return result;
};

/** 入金カテゴリの表示用フルパステキストを取得。 */
export const categoryIncomeFullPathDisplayText = (state: States.IState, categoryId: number): string => {
  return categoryFullPathDisplayText(state.income.categories, categoryId);
};

/** 出金カテゴリの表示用フルパステキストを取得。 */
export const categoryOutgoFullPathDisplayText = (state: States.IState, categoryId: number): string => {
  return categoryFullPathDisplayText(state.outgo.categories, categoryId);
};

/** 指定カテゴリの表示用フルパステキストを取得。 */
export const categoryFullPathDisplayText = (
  categories: { [key: number]: States.ICategory },
  categoryId: number,
): string => {
  const funcParentPath = (catId: number): string => {
    const cat = categories[catId];
    if (cat.parent == null || categories[cat.parent].parent == null) {
      return cat.name;
    }
    return `${funcParentPath(cat.parent)} > ${cat.name}`;
  };
  return funcParentPath(categoryId);
};

/** 入金Palmカテゴリ情報を追加。 */
export const palmCategoryInfoIncomeAdd = (
  state: States.IState,
  name: string,
  accountId: number,
  categoryId: number,
): void => {
  // 既にあったらまず削除
  const target = state.importTool.palmCategories.income;
  if (name in target) {
    delete target[name];
  }
  // 追加
  target[name] = {
    account: accountId,
    category: categoryId,
  };
};

/** 出金Palmカテゴリ情報を追加。 */
export const palmCategoryInfoOutgoAdd = (
  state: States.IState,
  name: string,
  accountId: number,
  categoryId: number,
): void => {
  // 既にあったらまず削除
  const target = state.importTool.palmCategories.outgo;
  if (name in target) {
    delete target[name];
  }
  // 追加
  target[name] = {
    account: accountId,
    category: categoryId,
  };
};
