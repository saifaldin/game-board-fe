import React, { useState } from 'react';
import _ from 'lodash';
import './Goal.css'; // You can create a separate CSS file for styling

const Goal = (props) => {
  const { socket, goalRandomColors } = props;
  const [goal, setGoal] = useState(goalRandomColors);

  socket.on('start', ({ goalRandomColors }) => {
    setGoal(goalRandomColors);
  });

  return (
    <div className="goal">
      <h1>Goal</h1>
      <div className="goal-container">
        {goal.map((color, colIndex) => (
          <div key={colIndex} style={{ backgroundColor: color }} className="color-pattern-row"></div>
        ))}
      </div>
    </div>
  );
};

export default Goal;
