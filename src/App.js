import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Board from './Board';
import Goal from './Goal';
import _ from 'lodash';
import HomePage from './Home';

const App = (props) => {
  const { socket } = props;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage socket={socket} />} />
        <Route path="/game/:username" element={(
          <div id='game'>
            <Goal socket={socket} goalRandomColors={Array(9).fill(null)} />
            <Board socket={socket} initialBoard={Array(25).fill(null)} myboard={true} />
            <Board socket={socket} initialBoard={Array(25).fill(null)} myboard={false} />
          </div>
        )} />
      </Routes>
    </Router>
  );
};

export default App;
