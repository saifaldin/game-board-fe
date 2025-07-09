import React from 'react';
import ReactDOM from 'react-dom/client';
import io from 'socket.io-client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import App from './App';
const socket = io('https://6d8b-156-218-13-163.ngrok.io', {
  transports: ['websocket'],
});

// Test

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App socket={socket}/>
  </React.StrictMode>
);

reportWebVitals();
