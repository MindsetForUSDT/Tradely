import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-surface-border/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
                  <path d="M3 17l4-8 4 6 6-10 3 4" />
                </svg>
              </div>
              <span className="text-sm font-bold">Tradeum<span className="text-accent-green">Diary</span></span>
            </Link>
            <p className="text-xs text-text-muted">Премиум дневник трейдера.</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase mb-3">Продукт</h4>
            <ul className="space-y-2">
              <li><Link to="/#features" className="text-xs text-text-muted hover:text-text-primary">Возможности</Link></li>
              <li><Link to="/subscribe" className="text-xs text-text-muted hover:text-text-primary">Тарифы</Link></li>
              <li><a href="mailto:info@tradeumdiary.ru" className="text-xs text-text-muted hover:text-text-primary">Контакты</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase mb-3">Правовая информация</h4>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-xs text-text-muted hover:text-text-primary">Условия</Link></li>
              <li><Link to="/privacy" className="text-xs text-text-muted hover:text-text-primary">Конфиденциальность</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-surface-border/20 text-center">
          <p className="text-xs text-accent-red/60 mt-4 text-center">
            Не является инвестиционной рекомендацией. Торговля сопряжена с риском потери капитала.</p>
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} TradeumDiary. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}