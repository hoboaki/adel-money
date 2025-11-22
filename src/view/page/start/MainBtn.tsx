import ClassNames from 'classnames';
import * as React from 'react';

import BasicStyles from './../../Basic.css';
import Styles from './MainBtn.css';

interface IProps {
  isEnabled: boolean;
  onClicked: (withMetaKey: boolean) => void;
  title: string;
}

class MainBtn extends React.Component<IProps> {
  public constructor(props: IProps) {
    super(props);
  }

  public render() {
    const rootClass = ClassNames(Styles.Root, BasicStyles.StdBtnPrimary);
    return (
      <button
        className={rootClass}
        onClick={(e) => this.onClicked(e)}
        disabled={!this.props.isEnabled}
        title={this.props.title}
      >
        <span>{this.props.title}</span>
      </button>
    );
  }

  private onClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    e.stopPropagation();
    this.props.onClicked(e.metaKey);
  }
}

export default MainBtn;
