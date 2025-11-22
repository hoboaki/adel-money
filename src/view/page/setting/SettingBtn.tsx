import ClassNames from 'classnames';
import * as React from 'react';
import Materialicon from 'src/view/widget/material-icon';

import BasicStyles from '../../Basic.css';
import Styles from './SettingBtn.css';

interface IProps {
  onClicked: () => void;
  title: string;
  iconName: string;
  disabled: boolean;
}

class SideBarBtn extends React.Component<IProps> {
  public constructor(props: IProps) {
    super(props);
  }

  public render() {
    const rootClass = ClassNames(Styles.Root, BasicStyles.StdBtnPrimary);
    return (
      <button
        className={rootClass}
        onClick={this.props.onClicked}
        disabled={this.props.disabled}
        title={this.props.title}
      >
        <Materialicon name={this.props.iconName} darkMode={false} classNames={[]} />
        <span>{this.props.title}</span>
      </button>
    );
  }
}

export default SideBarBtn;
