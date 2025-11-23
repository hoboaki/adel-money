import ClassNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import IStoreState from 'src/state/IStoreState';
import * as UiStateMethods from 'src/state/ui/StateMethods';
import * as UiStates from 'src/state/ui/States';

import Styles from './TitleBar.css';

interface IProps {
  isActive: boolean;
}

interface ILocalProps extends IProps {
  state: UiStates.IState;
}

class TitleBar extends React.Component<ILocalProps> {
  public constructor(props: ILocalProps) {
    super(props);
  }

  public componentDidMount() {
    document.title = UiStateMethods.windowTitleText(this.props.state.document);
  }

  public componentDidUpdate() {
    document.title = UiStateMethods.windowTitleText(this.props.state.document);
  }

  public render() {
    const rootClass = ClassNames(Styles.Base, Styles.Bg, { [Styles.BgActive]: this.props.isActive });
    const titleClass = ClassNames(Styles.Base, Styles.Title);
    const titleText = UiStateMethods.windowTitleText(this.props.state.document);
    return (
      <div id="titleBar" className={rootClass}>
        <div className={titleClass}>
          <div>{`\uD83D\uDC27 ${titleText}`}</div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: IStoreState, props: IProps) => {
  const result: ILocalProps = Object.assign({}, props, {
    state: state.ui,
  });
  return result;
};
export default ReactRedux.connect(mapStateToProps)(TitleBar);
