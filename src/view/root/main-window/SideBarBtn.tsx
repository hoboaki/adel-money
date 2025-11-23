import ClassNames from 'classnames';
import * as React from 'react';

import Styles from './SideBarBtn.css';

interface IProps {
  onClicked: () => void;
  title: string;
  iconName: string;
  isActive: boolean;
  isEnabled: boolean;
}

class SideBarBtn extends React.Component<IProps> {
  public constructor(props: IProps) {
    super(props);
  }

  public render() {
    const rootClass = ClassNames(Styles.Root, { [Styles.RootActive]: this.props.isActive });
    const iconClass = ClassNames('material-icons', 'md-36', 'md-dark');
    return (
      <button
        className={rootClass}
        onClick={(e) => this.onClicked(e)}
        disabled={!this.props.isEnabled}
        title={this.props.title}
      >
        <i className={iconClass}>{this.props.iconName}</i>
      </button>
    );
  }

  private onClicked(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    e.stopPropagation();
    this.props.onClicked();
  }
}

export default SideBarBtn;
