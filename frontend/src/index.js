import React from 'react';
import ReactDOM from 'react-dom/client'; // ✅ Use 'react-dom/client'
import './index.css';
import FastChat from './App';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container); // ✅ React 18+ API

root.render(
  <React.StrictMode>
    <FastChat />
  </React.StrictMode>
);
