import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChartLineUp, House } from '@phosphor-icons/react';

export function NotFound() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="not-found-page public-v9-not-found">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="not-found-content"
      >
        <div className="not-found-code" aria-hidden="true">
          <span>4</span>
          <i />
          <span>4</span>
        </div>
        <p>Маршрут не найден</p>
        <h1>Здесь нет торгового решения.</h1>
        <span>Адрес мог измениться. Вернитесь к продукту или откройте рабочее пространство.</span>
        <div className="not-found-actions">
          <Link to="/">
            <House size={17} /> На главную
          </Link>
          <Link to="/dashboard">
            <ChartLineUp size={17} /> Открыть обзор <ArrowRight size={16} />
          </Link>
        </div>
        <p className="not-found-hint">
          Код ошибки <strong>404</strong> · данные аккаунта не затронуты
        </p>
      </motion.div>
    </div>
  );
}
