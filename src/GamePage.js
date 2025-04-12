import React from 'react';
import Board from './Board';
import Goal from './Goal';
import _ from 'lodash';

const GamePage = (socket) => {
  return (
    <div id='game'>
      <Goal socket={socket} goalRandomColors={Array(9).fill(null)} />
      <Board socket={socket} initialBoard={Array(25).fill(null)} name={'Me'} myboard={true} />
      <Board socket={socket} initialBoard={Array(25).fill(null)} name={'Them'} myboard={false} />
    </div>
  );
};

export default GamePage;
