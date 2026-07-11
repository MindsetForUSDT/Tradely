import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link to="/" className="auth-story-brand">
          TradeumDiary
        </Link>
        <div>
          <p>Торговая система начинается с честных данных</p>
          <h2>
            Фиксируйте решения.
            <br />
            Находите закономерности.
            <br />
            Контролируйте риск.
          </h2>
        </div>
        <ul>
          <li>Автоматический импорт сделок</li>
          <li>Риск и дисциплина в одном контексте</li>
          <li>PRO-аналитика и AI-разбор</li>
        </ul>
      </aside>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <p>TradeumDiary</p>
            <h1>{title}</h1>
            <span>{description}</span>
          </div>
          {children}
          <div className="auth-form-footer">{footer}</div>
        </div>
      </section>
    </div>
  );
}
