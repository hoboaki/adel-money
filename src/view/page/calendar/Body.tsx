import * as React from 'react';

import Balance from './Balance';
import Styles from './Body.css';
import Calendar from './Calendar';

class Body extends React.Component {
  public render() {
    return (
      <div className={Styles.Root}>
        <div className={Styles.Body}>
          <Calendar />
          <Balance />
        </div>
      </div>
    );
  }
}

export default Body;
