// ============================================================
// TradeumDiary — Футер
// Минималистичный, с ссылками и контактами
// ============================================================

import { Link } from 'react-router-dom';

const footerLinks = [
  {
    title: 'Продукт',
    links: [
      { label: 'Возможности', href: '/#features' },
      { label: 'Тарифы', href: '/subscribe' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Компания',
    links: [
      { label: 'О нас', href: '/about' },
      { label: 'Блог', href: '/blog' },
      { label: 'Контакты', href: 'mailto:info@tradeumdiary.ru' },
    ],
  },
  {
    title: 'Правовая информация',
    links: [
      { label: 'Условия использования', href: '/terms' },
      { label: 'Политика конфиденциальности', href: '/privacy' },
      { label: 'Оферта', href: '/offer' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-surface-border/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Бренд */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
                  <path d="M3 17l4-8 4 6 6-10 3 4" />
                </svg>
              </div>
              <span className="text-sm font-bold">
                Tradeum<span className="text-accent-green">Diary</span>
              </span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed max-w-48">
              Премиум дневник трейдера. Автоматический импорт сделок и глубокая аналитика.
            </p>
          </div>

          {/* Ссылки */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-xs text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Нижняя строка */}
        <div className="mt-10 pt-6 border-t border-surface-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} TradeumDiary. Все права защищены.
          </p>
          <p className="text-xs text-text-muted">
            <a href="mailto:info@tradeumdiary.ru" className="hover:text-text-secondary transition-colors">
              info@tradeumdiary.ru
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}