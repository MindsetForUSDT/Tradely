import {
  ArrowClockwise,
  ArrowRight,
  Check,
  Database,
  PlugsConnected,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { getFirstRunState, type FirstRunSource } from '@/lib/firstRun';

interface FirstRunJourneyProps {
  sources: FirstRunSource[];
  onConnect: () => void;
  onSync: (sourceId: string) => void;
}

const steps = [
  { label: 'Источник', detail: 'Read-only доступ', icon: PlugsConnected },
  { label: 'Импорт', detail: 'Финальные сделки', icon: Database },
  { label: 'Проверка', detail: 'Полнота расчётов', icon: ShieldCheck },
  { label: 'Отчёт', detail: 'Первая аналитика', icon: ArrowRight },
];

export function FirstRunJourney({ sources, onConnect, onSync }: FirstRunJourneyProps) {
  const state = getFirstRunState(sources);

  return (
    <section className={`first-run-journey ${state.stage}`} aria-labelledby="first-run-title">
      <header>
        <div>
          <small>Первый запуск</small>
          <h2 id="first-run-title">От подключения до проверенного отчёта</h2>
        </div>
        <span className={state.stage}>
          {state.stage === 'failed' || state.stage === 'review' ? (
            <WarningCircle size={16} weight="fill" />
          ) : state.stage === 'ready' ? (
            <Check size={16} />
          ) : (
            <i />
          )}
          {state.stage === 'ready' ? 'Готово' : `Шаг ${state.activeStep + 1} из 4`}
        </span>
      </header>

      <ol>
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const done = index < state.activeStep || state.stage === 'ready';
          const current = index === state.activeStep && state.stage !== 'ready';
          return (
            <li key={step.label} className={done ? 'done' : current ? 'current' : ''}>
              <span>{done ? <Check size={15} /> : <StepIcon size={16} />}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
              {index < steps.length - 1 ? <i /> : null}
            </li>
          );
        })}
      </ol>

      <footer>
        <div>
          <strong>{state.title}</strong>
          <span>{state.detail}</span>
        </div>
        {state.action === 'connect' ? (
          <button type="button" onClick={onConnect}>
            Подключить Bybit <ArrowRight size={15} />
          </button>
        ) : state.action === 'sync' && state.sourceId ? (
          <button type="button" onClick={() => onSync(state.sourceId!)}>
            <ArrowClockwise size={15} /> Повторить импорт
          </button>
        ) : state.action === 'review' ? (
          <Link to="/dashboard/trades">
            Проверить сделки <ArrowRight size={15} />
          </Link>
        ) : state.action === 'report' ? (
          <Link to="/dashboard">
            Открыть отчёт <ArrowRight size={15} />
          </Link>
        ) : (
          <span className="first-run-wait">
            <ArrowClockwise size={15} className="spin" /> Обновится автоматически
          </span>
        )}
      </footer>
    </section>
  );
}
