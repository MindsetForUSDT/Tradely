// ============================================================
// TradeumDiary — Точка входа
// Строгий режим React для выявления потенциальных проблем
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Инициализируем корневой элемент
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '❌ TradeumDiary: Корневой элемент #root не найден в DOM.\n' +
    'Проверьте index.html — там должен быть <div id="root"></div>.'
  );
}

// Рендерим приложение
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);