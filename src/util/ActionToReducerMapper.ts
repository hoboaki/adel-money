import { cloneDeep } from 'lodash';
import { Action } from 'redux';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkOfAction<S, A extends Action = any> = (state: S, action: A) => void;

/**
 * action に対する reducer の処理を管理する
 */
class ActionToReducerMapper<S> {
  /** アクション・タイプと処理の定義を保持する。 */
  private works: { [actionKey: string]: WorkOfAction<S> } = {};
  /** アクション・タイプと処理の定義を追加する。 */
  public addWork = <A extends Action>(actionType: string, func: WorkOfAction<S, A>) => {
    this.works[actionType] = func;
  };
  /** 処理を実行する。
   * 該当するアクション・タイプがあった場合、state をクローンして指定の処理を行い、返す。
   * 該当するアクション・タイプが無い場合、何も処理を行わず、state もクローンせずにそのまま返す。
   */
  public execute = (state: S, action: Action) => {
    let newState = state;
    const process = this.works[action.type];
    if (process) {
      newState = cloneDeep(state as any) as S;
      process(newState, action);
    }
    return newState;
  };
}

const createActionToReducerMapper = <S>() => {
  return new ActionToReducerMapper<S>();
};

export default createActionToReducerMapper;
