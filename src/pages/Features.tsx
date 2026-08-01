import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowsLeftRight,
  ChartLineUp,
  CheckCircle,
  Database,
  ShieldCheck,
  Target,
  TrendUp,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';

const features = [
  {
    number: '01',
    icon: Database,
    title: 'Финальные сделки без ручной рутины',
    copy: 'Read-only подключение Bybit импортирует закрытые Spot и Linear сделки, объединяет частичные исполнения и защищает историю от дублей.',
    facts: ['Проверка системного флага Read-Only', 'Автосинхронизация', 'История импортов'],
  },
  {
    number: '02',
    icon: ArrowsLeftRight,
    title: 'Результат, который можно проверить',
    copy: 'Каждая сделка раскладывается на движение цены, комиссии, funding и итоговый net P&L. Единицы количества и направление позиции подписаны явно.',
    facts: ['Gross P&L', 'Fees + funding', 'Net P&L и R-multiple'],
  },
  {
    number: '03',
    icon: TrendUp,
    title: 'Контекст торгового решения',
    copy: 'Сетап, стоп, соблюдение плана, MAE/MFE, эмоция и заметка находятся рядом с исполнением — не в отдельном забытом блокноте.',
    facts: ['План → вход → выход', 'MAE / MFE', 'Теги и заметки'],
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Риск до того, как он станет убытком',
    copy: 'Дневной лимит, риск на сделку и серия убытков превращаются в конкретные ограничения процесса, а не в декоративные показатели.',
    facts: ['Риск на сделку', 'Дневной лимит', 'Контроль серии'],
  },
  {
    number: '05',
    icon: ChartLineUp,
    title: 'Паттерны на достаточной выборке',
    copy: 'Сравнивайте сетапы, торговые часы и дни недели по expectancy, win rate, profit factor и просадке — без выводов по одной удачной сделке.',
    facts: ['Expectancy', 'Эффективность сетапов', 'Слабые окна'],
  },
  {
    number: '06',
    icon: Target,
    title: 'Цели процесса вместо погони за P&L',
    copy: 'Tradeum помогает измерять не обещанную прибыль, а повторяемые действия: заполнение контекста, соблюдение риска и качество исполнения плана.',
    facts: ['Цели дисциплины', 'Прогресс по процессу', 'Еженедельный разбор'],
  },
];

export function Features() {
  const { user } = useAuth();
  const actionHref = user ? '/dashboard' : '/register';

  return (
    <div className="features-page public-v9-features">
      <header className="features-hero">
        <div>
          <Link to="/">TradeumDiary</Link>
          <h1>
            Не больше данных.
            <br />
            Больше ясных решений.
          </h1>
        </div>
        <div>
          <p>
            Полный цикл после сделки: получить точные исполнения, проверить результат, добавить
            контекст и изменить одно правило.
          </p>
          <Link className="cinematic-action" to={actionHref}>
            <span>{user ? 'Открыть рабочее пространство' : 'Создать дневник'}</span>
            <i>
              <ArrowRight size={17} />
            </i>
          </Link>
        </div>
      </header>

      <section className="features-proof" aria-label="Принципы продукта">
        <span>
          <strong>Read-only</strong> без доступа к средствам
        </span>
        <span>
          <strong>Net P&amp;L</strong> с комиссиями и funding
        </span>
        <span>
          <strong>2 тарифа</strong> Free и PRO 499 ₽
        </span>
      </section>

      <section className="features-index" aria-label="Возможности TradeumDiary">
        {features.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <article key={feature.number}>
              <span>{feature.number}</span>
              <div className="features-icon">
                <FeatureIcon size={22} />
              </div>
              <div>
                <h2>{feature.title}</h2>
                <p>{feature.copy}</p>
              </div>
              <ul>
                {feature.facts.map((fact) => (
                  <li key={fact}>
                    <CheckCircle size={15} /> {fact}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="features-closing">
        <div>
          <span>Торговая история становится полезной только после разбора.</span>
          <h2>Сделайте следующий вывод проверяемым.</h2>
        </div>
        <Link className="cinematic-action" to={actionHref}>
          <span>{user ? 'Перейти к обзору' : 'Начать бесплатно'}</span>
          <i>
            <ArrowRight size={17} />
          </i>
        </Link>
      </section>
    </div>
  );
}
