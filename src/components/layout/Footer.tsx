import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mono-footer">
      <div className="mono-footer-inner">
        <div>
          <Link className="mono-logo" to="/">
            TradeumDiary
          </Link>
          <p>Торговый дневник, который превращает данные в решения.</p>
        </div>
        <div>
          <Link to="/terms">Условия</Link>
          <Link to="/privacy">Конфиденциальность</Link>
          <a href="mailto:info@tradeumdiary.ru">Контакты</a>
        </div>
      </div>
      <div className="mono-footer-bottom">
        <span>© {new Date().getFullYear()} TradeumDiary</span>
        <span>Не является инвестиционной рекомендацией.</span>
      </div>
    </footer>
  );
}
