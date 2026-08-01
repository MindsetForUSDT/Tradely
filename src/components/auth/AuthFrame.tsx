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

type AuthMode = 'login' | 'register' | 'recovery' | 'update' | 'logout';

const authStories: Record<
  AuthMode,
  { index: string; title: string; copy: string; result: string; note: string }
> = {
  login: {
    index: '01',
    title: 'Вернитесь к системе, а не к шуму.',
    copy: 'История решений, риск и фактический результат ждут в одном рабочем пространстве.',
    result: '+1.92R',
    note: 'Выход выполнен по плану',
  },
  register: {
    index: '02',
    title: 'Начните с фактов о своей торговле.',
    copy: 'Первый честный обзор появится после подключения read-only источника. Карта не нужна.',
    result: '30 дней',
    note: 'истории доступны на Free',
  },
  recovery: {
    index: '03',
    title: 'Доступ можно восстановить безопасно.',
    copy: 'Одноразовая ссылка меняет только пароль Tradeum и никогда не касается доступа к бирже.',
    result: '1 час',
    note: 'срок действия ссылки',
  },
  update: {
    index: '04',
    title: 'Новый пароль — отдельный от биржи.',
    copy: 'Используйте уникальную комбинацию. Tradeum не запрашивает пароль или ключ вывода средств.',
    result: 'Read-only',
    note: 'единственный режим источника',
  },
  logout: {
    index: '05',
    title: 'Сессия закрывается, история остаётся.',
    copy: 'Выход удаляет авторизацию из браузера, но не затрагивает сделки и подключённые источники.',
    result: 'Защищено',
    note: 'данные рабочего пространства',
  },
};

export function AuthFrame({
  title,
  description,
  children,
  footer,
  mode = 'login',
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  mode?: AuthMode;
}) {
  const story = authStories[mode];
  return (
    <div className={`auth-page auth-page-v9 auth-page-${mode}`}>
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
        <span className="auth-story-index">{story.index} / 05</span>
        <div className="auth-story-copy">
          <h2>{story.title}</h2>
          <p>{story.copy}</p>
        </div>

        <div className="auth-market-scene" aria-hidden="true">
          <div className="auth-market-result">
            <span>Контрольная точка</span>
            <strong>{story.result}</strong>
            <small>
              <ShieldCheck size={14} /> {story.note}
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
