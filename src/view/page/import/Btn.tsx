import ClassNames from 'classnames';
import * as React from 'react';

import BasicStyles from '../../Basic.css';
import Styles from './Btn.css';

interface IProps {
  onClicked: () => void;
  title: string;
  isEnabled: boolean;
}

class Btn extends React.Component<IProps> {
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
    this.props.onClicked();
  }
}

export default Btn;
