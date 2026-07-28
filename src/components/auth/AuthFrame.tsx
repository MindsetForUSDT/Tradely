import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FileText,
  LockKeyOpen,
  ShieldCheck,
  TrendUp,
} from '@phosphor-icons/react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const authCurve = [
  { value: 8120 },
  { value: 8460 },
  { value: 8350 },
  { value: 8780 },
  { value: 9140 },
  { value: 9320 },
  { value: 9680 },
  { value: 9550 },
  { value: 10040 },
  { value: 10320 },
  { value: 10890 },
  { value: 10740 },
  { value: 11220 },
  { value: 11640 },
];

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
          <span className="tradeum-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          TradeumDiary
        </Link>
        <div className="auth-story-copy">
          <h2>
            Ваш системный подход
            <br />к торговле.
          </h2>
          <p>Завершённые сделки, риск и контекст — в одной ясной системе.</p>
        </div>

        <div className="auth-market-scene" aria-hidden="true">
          <div className="auth-market-result">
            <span>Итог по последней сделке</span>
            <strong>+1.92R</strong>
            <small>
              <ShieldCheck size={14} /> Риск соблюдён
            </small>
          </div>
          <div className="auth-market-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={authCurve} margin={{ top: 8, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="authCurveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c5a787" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#c5a787" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#cbb79f"
                  strokeWidth={1.6}
                  fill="url(#authCurveFill)"
                  isAnimationActive
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="auth-decision-line">
            <article>
              <span>
                <FileText size={17} />
              </span>
              <strong>План</strong>
              <small>Пробой + ретест</small>
            </article>
            <article>
              <span>
                <TrendUp size={17} />
              </span>
              <strong>Вход</strong>
              <small>Риск 0.62%</small>
            </article>
            <article>
              <span>
                <Check size={17} />
              </span>
              <strong>Выход по плану</strong>
              <small>Остаток · +1.92R</small>
            </article>
          </div>
        </div>
      </aside>
      <section className="auth-form-side">
        <Link className="auth-home-link" to="/">
          На главную <ArrowRight size={17} />
        </Link>
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <h1>{title}</h1>
            <span>{description}</span>
          </div>
          {children}
          <div className="auth-form-footer">{footer}</div>
          <div className="auth-security-note">
            <LockKeyOpen size={15} />
            Только чтение. Без доступа к средствам.
          </div>
        </div>
      </section>
    </div>
  );
}
