import * as React from 'react';
import * as ReactRedux from 'react-redux';
import IStoreState from 'src/state/IStoreState';
import * as UiStates from 'src/state/ui/States';
import MaterialIcon from 'src/view/widget/material-icon';

import Styles from './Header.css';

interface IProps {
  states: UiStates.IPageSetting;
  title: string;
  iconName: string;
}

class Header extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <div className={Styles.Root}>
        <div className={Styles.Body}>
          <MaterialIcon name={this.props.iconName} classNames={[]} darkMode={false} />
          <span>{this.props.title}</span>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: IStoreState) => {
  return {
    states: state.ui.pageSetting,
  };
};
export default ReactRedux.connect(mapStateToProps)(Header);
