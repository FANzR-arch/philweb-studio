import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioApp } from './StudioApp';
import './studio.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <StudioApp />
  </React.StrictMode>,
);
