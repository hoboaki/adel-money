import * as remote from '@electron/remote';

export const showInfoDialog = (title: string, msg: string, detail: string | undefined): void => {
  const dialog = remote.dialog;
  dialog.showMessageBoxSync(remote.getCurrentWindow(), {
    type: 'info',
    buttons: ['OK'],
    defaultId: 0,
    title: title,
    message: msg,
    detail,
  });
};

export const showOkCancelDialog = (
  title: string,
  msg: string,
  detail: string | undefined,
  labelOk: string,
): boolean => {
  const dialog = remote.dialog;
  const result = dialog.showMessageBoxSync(remote.getCurrentWindow(), {
    type: 'question',
    buttons: [labelOk, 'キャンセル'],
    defaultId: 0,
    title: title,
    message: msg,
    detail,
    cancelId: 1,
  });
  return result === 0;
};

export enum YesNoCacnelDialogResult {
  Yes,
  No,
  Cancel,
}

export const showYesNoCancelDialog = (
  title: string,
  msg: string,
  detail: string | undefined,
  labelYes: string,
  labelNo: string,
): YesNoCacnelDialogResult => {
  const dialog = remote.dialog;
  const result = dialog.showMessageBoxSync(remote.getCurrentWindow(), {
    type: 'question',
    buttons: [labelYes, labelNo, 'キャンセル'],
    defaultId: 0,
    title: title,
    message: msg,
    detail,
    cancelId: 2,
  });
  switch (result) {
    case 0:
      return YesNoCacnelDialogResult.Yes;
    case 1:
      return YesNoCacnelDialogResult.No;
    default:
      return YesNoCacnelDialogResult.Cancel;
  }
};

export const showErrorDialog = (title: string, msg: string, detail: string | undefined): void => {
  const dialog = remote.dialog;
  dialog.showMessageBoxSync(remote.getCurrentWindow(), {
    type: 'error',
    buttons: ['OK'],
    defaultId: 0,
    title: title,
    message: msg,
    detail,
  });
};
