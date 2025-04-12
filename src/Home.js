import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const HomePage = (props) => {
  const { socket } = props;
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleStartGame = () => {
    socket.emit('join', { username });
    navigate(`/game/${username}`, { state: { username } });
  };

  socket.on('goHome', () => {
    navigate('/')
  });

  return (
    <form className='username_form'>
      <h1>المربعات الملونة الشيقة المجنونة الأمورة مؤقتاً</h1>
      <input
        type="text"
        placeholder="Name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleStartGame}>Start Game</button>
    </form>
  );
};

export default HomePage;
