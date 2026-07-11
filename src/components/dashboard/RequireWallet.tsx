import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icons';

export function RequireWallet() {
  const navigate = useNavigate();
  return (
    <section className="dashboard-onboarding">
      <div className="dashboard-onboarding-head">
        <p>Рабочее пространство</p>
        <h1>Добро пожаловать в TradeumDiary</h1>
        <span>
          Подключите источник, чтобы превратить историю сделок в понятную систему решений.
        </span>
      </div>
      <div className="dashboard-onboarding-panel">
        <div className="dashboard-onboarding-icon">
          <Icon name="wallet-add" size={28} />
        </div>
        <p className="dashboard-onboarding-step">Шаг 1 из 3</p>
        <h2>Подключите первый источник</h2>
        <p>
          Добавьте биржу, публичный адрес кошелька или импортируйте CSV. Мы не показываем демо-цифры
          вместо ваших результатов.
        </p>
        <button type="button" onClick={() => navigate('/dashboard/wallets')}>
          <Icon name="wallet-add" size={17} /> Подключить источник
        </button>
        <div className="dashboard-onboarding-trust">
          <span>Только чтение</span>
          <span>Шифрование AES-256</span>
          <span>Без доступа к средствам</span>
        </div>
      </div>
      <div className="dashboard-onboarding-flow">
        <article>
          <span>01</span>
          <div>
            <strong>Источник</strong>
            <small>Биржа, кошелёк или файл</small>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <strong>Контекст</strong>
            <small>Теги, решения и риск</small>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <strong>Обратная связь</strong>
            <small>Метрики и AI-разбор</small>
          </div>
        </article>
      </div>
    </section>
  );
}
