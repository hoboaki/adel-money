import { Action, combineReducers, createStore, Store } from 'redux';

import DocReducer from './doc/Reducer';
import IStoreState from './IStoreState';
import UiReducer from './ui/Reducer';

// 複数の reducer を束ねる
const combinedReducer = combineReducers({
  doc: DocReducer,
  ui: UiReducer,
  // reducer が増えたら足していく
});

// グローバルオブジェクトとして、store を作成する。
const store: Store<IStoreState, Action> = createStore(combinedReducer);
export default store;
