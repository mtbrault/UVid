import React from 'react';
import { Router, Route, Switch } from 'react-router-dom';
import { createBrowserHistory } from 'history';

import Form from './components/Form';
import Call from './components/Call';

const history = createBrowserHistory();

const App = () => (
  <Router history={history}>
    <Switch>
      <Route exact path="/:id" component={Call} />
      <Route path="/" component={Form} />
    </Switch>
  </Router>
);

export default App;
