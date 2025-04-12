import React, { useEffect, useState } from 'react';
import _, { set } from 'lodash';
import './Board.css';
import { useLocation, useNavigate } from 'react-router-dom';

const boardGoalPositions = [6, 7, 8, 11, 12, 13, 16, 17, 18];
const boardNonGoalPositions = [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24];

const move = (board, from, to) => {
  const newBoard = [...board];
  [newBoard[to], newBoard[from]] = [newBoard[from], newBoard[to]];
  return newBoard;
};

const checkWin = (board, goal) => {
  const boardSubset = boardGoalPositions.map((i) => board[i]);
  console.log(boardSubset, goal);
  return _.isEqual(boardSubset, goal);
};

const Board = (props) => {
  const { socket, myboard, initialBoard } = props;
  const { state } = useLocation();
  const navigate = useNavigate();
  const [board, setBoard] = useState(initialBoard);
  const [goal, setGoal] = useState([]);
  const [won, setWon] = useState(false);
  const [stop, setStop] = useState(false);
  const [playerLeft, setPlayerLeft] = useState(false);
  const [myUsername] = useState(state && state.username);
  const [opponentUsername, setOpponentUsername] = useState('');

  useEffect(() => {
    if (!myUsername) {
      navigate('/');
    }
  }, [myUsername, navigate]);

  const name = myboard ? myUsername : opponentUsername;

  socket.on('start', ({ initialBoard, goalRandomColors, opponentUsername }) => {
    setBoard(initialBoard);
    setGoal(goalRandomColors);
    setWon(false);
    setStop(false);
    setOpponentUsername(opponentUsername);
  });

  socket.on('move', ({ from, to }) => {
    if (!myboard) {
      setBoard(move(board, from, to));
    }
  });

  socket.on('opponentWins', ({ board }) => {
    if (!myboard) {
      setBoard(board);
      setWon(true);
    }
    setStop(true);
  });

  socket.on('playerLeft', () => {
    setStop(true);
    setPlayerLeft(true);
  });

  const handleButtonClick = (index) => {
    const nearestEmptySlot = ([
      Math.max(index - 1, 0),
      Math.max(index + 1, 0),
      Math.max(index - 5, 0),
      Math.max(index + 5, 0),
    ].filter((slot) => board[slot] === '#000'))[0];

    if (!stop && myboard && nearestEmptySlot !== undefined) {
      socket.emit('move', { from: index, to: nearestEmptySlot });
      const newBoard = move(board, index, nearestEmptySlot);
      if (checkWin(newBoard, goal)) {
        const newBoard = [...board];
        boardNonGoalPositions.forEach((i) => newBoard[i] = '#000');
        boardGoalPositions.forEach((boardIndex, goalIndex) => newBoard[boardIndex] = goal[goalIndex]);
        setBoard(newBoard);
        setWon(true);
        socket.emit('opponentWins', { board: newBoard });
      } else {
        setBoard(newBoard);
      }
    }
  };

  const reload = () => {
    socket.emit('reload');
  }

  return (
    <div className="board-container">
      {won && <button className="play-again" onClick={() => reload()}>Play Again</button>}
      {(playerLeft && !myboard) && <h1 className="winner-title">Opponent Left. Waiting for new Opponent . . .</h1>}
      <h1 className={`${won ? 'winner-title' : ''}`}>{won ? `${name} Wins !!` : name}</h1>
      <div className={`game-board ${won ? 'glow' : ''}`}>
        {board.map((cell, i) => (
          <div key={i} style={{ backgroundColor: cell }} className="board-cell" onClick={() => handleButtonClick(i)}></div>
        ))}
      </div>
    </div>
  );
};

export default Board;
