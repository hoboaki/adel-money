import * as remote from '@electron/remote';
import Storage from 'electron-json-storage';

import Root from './Root';

const key = 'LocalSetting';

/** データ保存先指定 */
Storage.setDataPath(remote.app.getPath('userData'));

/** 現在のファイルバージョン。互換性が保てなくなったら上げる。 */
const versionCurrent = 1;

/** Json フォーマット。 */
interface IJsonRoot {
  /** ファイルバージョン。 */
  version: number;

  /** データのルート。 */
  data: Root;
}

/** Root オブジェクトをロード＆取得。 */
export const load = (callback: (root: Root) => void) => {
  Storage.get(key, (err, jsonRootRaw) => {
    if (err) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonRootAny: any = jsonRootRaw;
    const jsonRoot: IJsonRoot = jsonRootAny;
    let root = new Root();
    if (Object.keys(jsonRoot).length !== 0 && jsonRoot.version === versionCurrent) {
      root = jsonRoot.data;
    }
    callback(root);
  });
};

/** Root オブジェクトを保存。 */
export const save = (root: Root) => {
  const data: IJsonRoot = {
    version: versionCurrent,
    data: root,
  };
  Storage.set(key, data, (err) => {
    if (err) {
      return;
    }
  });
};
