import ClassNames from 'classnames';
import * as React from 'react';

import LayoutStyles from '../../Layout.css';
import PageStyles from '../Page.css';
import Body from './Body';
import Header from './Header';

class Main extends React.Component {
  public static PageId = 'Calendar';

  public render() {
    const rootClass = ClassNames(PageStyles.Base, LayoutStyles.TopToBottom);
    return (
      <div className={rootClass}>
        <Header />
        <Body />
      </div>
    );
  }
}

export default Main;
