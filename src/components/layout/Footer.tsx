import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mono-footer public-v9-footer">
      <div className="mono-footer-inner">
        <div className="public-v9-footer-brand">
          <Link className="mono-logo" to="/">
            <span className="tailark-brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <strong>TradeumDiary</strong>
          </Link>
          <p>Честный разбор завершённых сделок, риска и торговых решений.</p>
        </div>
        <div className="public-v9-footer-links">
          <nav aria-label="Продукт">
            <strong>Продукт</strong>
            <Link to="/features">Возможности</Link>
            <Link to="/subscribe">Тарифы</Link>
            <Link to="/login">Войти</Link>
          </nav>
          <nav aria-label="Документы">
            <strong>Документы</strong>
            <Link to="/terms">Условия</Link>
            <Link to="/privacy">Конфиденциальность</Link>
            <a href="mailto:support@tradeumdiary.com">Поддержка</a>
          </nav>
        </div>
      </div>
      <div className="mono-footer-bottom">
        <span>© {new Date().getFullYear()} TradeumDiary</span>
        <span>Аналитический сервис. Не является инвестиционной рекомендацией.</span>
      </div>
    </footer>
  );
}
