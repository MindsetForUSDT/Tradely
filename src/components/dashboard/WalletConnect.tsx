import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowClockwise,
  ArrowRight,
  CalendarBlank,
  Check,
  CheckCircle,
  Clock,
  Database,
  Eye,
  EyeSlash,
  FileCsv,
  Info,
  Key,
  Lock,
  PlugsConnected,
  ShieldCheck,
  Trash,
  X,
  XCircle,
} from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SourceLogo } from '@/components/brand/SourceLogo';
import { api } from '@/lib/api';
import { formatUSD } from '@/lib/utils';

interface Wallet {
  id: string;
  address: string;
  chain: string;
  label?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  last_synced_at?: string;
  import_from_date?: string;
  cex_provider?: string;
  settings?: string;
  added_at: string;
  _count?: { trades: number };
}

interface ValidationState {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  balance?: number;
  readOnly?: boolean;
  ipBound?: boolean;
  error?: string;
}

type SheetStep = 'access' | 'verified' | 'import';

const bybitHistoryMinDate = () => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 2);
  return date.toISOString().split('T')[0];
};

const today = () => new Date().toISOString().split('T')[0];

function formatSyncTime(value?: string) {
  if (!value) return 'Ещё не запускалась';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function nextSyncLabel(wallets: Wallet[]) {
  const latest = wallets
    .map((wallet) => wallet.last_synced_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (!latest) return 'после подключения';
  const elapsed = Math.floor((Date.now() - new Date(latest).getTime()) / 60_000);
  const left = Math.max(0, 60 - elapsed);
  return left === 0 ? 'в ближайшее время' : `через ${left} мин`;
}

function readBalance(wallet: Wallet) {
  try {
    const settings = JSON.parse(wallet.settings || '{}') as {
      currentBalance?: number;
      initialBalance?: number;
    };
    const value = settings.currentBalance ?? settings.initialBalance;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function statusMeta(wallet: Wallet) {
  if (wallet.processing_status === 'failed') {
    return {
      label: 'Требуется внимание',
      copy: wallet.error_message || 'Последний импорт завершился с ошибкой',
      tone: 'failed',
    };
  }
  if (wallet.processing_status === 'processing' || wallet.processing_status === 'pending') {
    return {
      label: 'Синхронизация',
      copy: 'Загружаем и нормализуем финальные сделки',
      tone: 'processing',
    };
  }
  return {
    label: 'Данные актуальны',
    copy: `Обновлено ${formatSyncTime(wallet.last_synced_at)}`,
    tone: 'ready',
  };
}

export function WalletConnect() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>('access');
  const [label, setLabel] = useState('Bybit основной');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [showSecret, setShowSecret] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' });
  const [adding, setAdding] = useState(false);
  const [syncingWalletId, setSyncingWalletId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loadWallets = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.get<Wallet[]>('/wallets');
      setWallets(data);
    } catch (error) {
      if (!silent)
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить источники');
      setWallets([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (!wallets.some((wallet) => ['pending', 'processing'].includes(wallet.processing_status))) {
      return;
    }
    const timer = window.setInterval(() => void loadWallets(true), 2500);
    return () => window.clearInterval(timer);
  }, [loadWallets, wallets]);

  const totalTrades = wallets.reduce((total, wallet) => total + (wallet._count?.trades || 0), 0);
  const totalBalance = wallets.reduce((total, wallet) => total + (readBalance(wallet) || 0), 0);
  const hasBalance = wallets.some((wallet) => readBalance(wallet) !== null);
  const hasBybit = wallets.some((wallet) => wallet.cex_provider === 'bybit');

  const resetSheet = () => {
    setSheetStep('access');
    setLabel('Bybit основной');
    setApiKey('');
    setApiSecret('');
    setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setValidation({ status: 'idle' });
    setShowSecret(false);
  };

  const openSheet = () => {
    resetSheet();
    setSheetOpen(true);
  };

  const closeSheet = () => {
    if (adding) return;
    setSheetOpen(false);
  };

  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !adding) setSheetOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [adding, sheetOpen]);

  const validateConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setValidation({ status: 'invalid', error: 'Введите API key и API secret' });
      return;
    }
    setValidation({ status: 'checking' });
    try {
      const result = await api.post<{
        valid: boolean;
        balance?: number;
        readOnly?: boolean;
        ipBound?: boolean;
        error?: string;
      }>('/wallets/validate', {
        provider: 'bybit',
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      if (!result.valid) {
        setValidation({
          status: 'invalid',
          error: result.error || 'Bybit отклонил ключи или права доступа',
        });
        return;
      }
      setValidation({
        status: 'valid',
        balance: result.balance,
        readOnly: result.readOnly,
        ipBound: result.ipBound,
      });
      setSheetStep('verified');
    } catch (error) {
      setValidation({
        status: 'invalid',
        error: error instanceof Error ? error.message : 'Не удалось проверить подключение',
      });
    }
  };

  const startSync = useCallback(
    async (walletId: string) => {
      setSyncingWalletId(walletId);
      try {
        await api.post(`/wallets/${walletId}/sync`, {});
        toast.success('Импорт запущен');
        await loadWallets(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось запустить импорт');
      } finally {
        setSyncingWalletId(null);
      }
    },
    [loadWallets]
  );

  const connectBybit = async () => {
    if (validation.status !== 'valid') {
      await validateConnection();
      return;
    }
    setAdding(true);
    try {
      const wallet = await api.post<Wallet>('/wallets', {
        address: `bybit:${Date.now().toString(36)}`,
        chain: 'crypto',
        label: label.trim() || 'Bybit',
        cex_provider: 'bybit',
        processing_status: 'pending',
        import_from_date: new Date(startDate).toISOString(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        settings: JSON.stringify({
          category: 'crypto',
          providerType: 'cex',
          providerId: 'bybit',
          autoSync: true,
          syncInterval: 60,
          initialBalance: validation.balance ?? 0,
          currentBalance: validation.balance ?? 0,
          balanceUpdatedAt: new Date().toISOString(),
        }),
      });
      setSheetStep('import');
      await loadWallets(true);
      void startSync(wallet.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось подключить Bybit');
    } finally {
      setAdding(false);
    }
  };

  const deleteWallet = async (wallet: Wallet) => {
    if (!window.confirm(`Удалить «${wallet.label || 'Bybit'}» и связанные сделки?`)) return;
    try {
      await api.delete(`/wallets/${wallet.id}`);
      await loadWallets(true);
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      toast.success('Источник удалён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить источник');
    }
  };

  const health = useMemo(() => {
    if (!wallets.length) return { label: 'Готово к подключению', tone: 'empty' };
    if (wallets.some((wallet) => wallet.processing_status === 'failed')) {
      return { label: 'Есть ошибка импорта', tone: 'failed' };
    }
    if (wallets.some((wallet) => wallet.processing_status === 'processing')) {
      return { label: 'Идёт синхронизация', tone: 'processing' };
    }
    return { label: 'Все данные актуальны', tone: 'ready' };
  }, [wallets]);

  return (
    <div className="premium-sources-page">
      <motion.header
        className="premium-sources-head"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Источники данных</h1>
          <p>Подключите биржу один раз — финальные сделки и баланс обновляются автоматически.</p>
        </div>
        {!hasBybit ? (
          <button type="button" onClick={openSheet}>
            <PlugsConnected size={17} /> Подключить Bybit
          </button>
        ) : null}
      </motion.header>

      <section className="premium-source-health" aria-label="Состояние импорта">
        <article>
          <span>Состояние</span>
          <strong className={health.tone}>
            <i /> {health.label}
          </strong>
        </article>
        <article>
          <span>Источники</span>
          <strong>{wallets.length}</strong>
        </article>
        <article>
          <span>Финальные сделки</span>
          <strong>{totalTrades}</strong>
        </article>
        <article>
          <span>Текущий капитал</span>
          <strong>{hasBalance ? formatUSD(totalBalance) : 'Нет данных'}</strong>
        </article>
        <article>
          <span>Следующая синхронизация</span>
          <strong>{nextSyncLabel(wallets)}</strong>
        </article>
      </section>

      {isLoading ? (
        <div className="premium-source-loading">
          <ArrowClockwise size={19} /> Загружаем подключения…
        </div>
      ) : null}

      <section className="premium-connected-sources">
        <header>
          <div>
            <h2>Подключённые источники</h2>
            <p>Ключи хранятся зашифрованно. Tradeum не возвращает их в браузер.</p>
          </div>
          <ShieldCheck size={20} />
        </header>
        {wallets.length ? (
          <div>
            {wallets.map((wallet) => {
              const status = statusMeta(wallet);
              const balance = readBalance(wallet);
              const syncing =
                wallet.processing_status === 'processing' || syncingWalletId === wallet.id;
              return (
                <article className={`premium-source-row ${status.tone}`} key={wallet.id}>
                  <span className="premium-source-logo">
                    <SourceLogo brand="bybit" size={30} />
                  </span>
                  <div className="premium-source-identity">
                    <span>
                      <strong>{wallet.label || 'Bybit'}</strong>
                      <em>
                        <i /> {status.label}
                      </em>
                    </span>
                    <small>{status.copy}</small>
                  </div>
                  <div className="premium-source-meta">
                    <span>
                      <Lock size={14} /> Read-only API
                    </span>
                    <small>
                      История с{' '}
                      {wallet.import_from_date
                        ? new Intl.DateTimeFormat('ru-RU').format(new Date(wallet.import_from_date))
                        : 'даты подключения'}
                    </small>
                  </div>
                  <div className="premium-source-meta">
                    <span>{wallet._count?.trades || 0} сделок</span>
                    <small>
                      {balance === null ? 'Баланс обновится при синхронизации' : formatUSD(balance)}
                    </small>
                  </div>
                  <div className="premium-source-actions">
                    <button
                      type="button"
                      onClick={() => void startSync(wallet.id)}
                      disabled={syncing}
                    >
                      <ArrowClockwise size={17} className={syncing ? 'spin' : ''} />
                      {syncing ? 'Обновляем' : 'Синхронизировать'}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void deleteWallet(wallet)}
                      aria-label={`Удалить ${wallet.label || 'Bybit'}`}
                    >
                      <Trash size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="premium-source-empty">
            <Database size={24} />
            <strong>Подключений пока нет</strong>
            <span>
              Bybit доступен сейчас. Новые источники появятся только после готовности импорта.
            </span>
            <button type="button" onClick={openSheet}>
              Подключить Bybit <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>

      <section className="premium-source-catalog">
        <header>
          <h2>Доступные источники</h2>
          <p>Неработающие интеграции не маскируются под готовые.</p>
        </header>
        <div>
          <article>
            <span>
              <SourceLogo brand="bybit" size={30} />
            </span>
            <div>
              <strong>Bybit</strong>
              <small>Финальные Spot и Linear сделки, комиссии и текущий баланс.</small>
            </div>
            <em className="available">Доступно</em>
            <button type="button" onClick={openSheet} disabled={hasBybit}>
              {hasBybit ? 'Подключено' : 'Подключить'}
            </button>
          </article>
          <article className="disabled">
            <span>
              <SourceLogo brand="binance" size={30} />
            </span>
            <div>
              <strong>Binance</strong>
              <small>Интеграция появится после проверки расчётов и импорта.</small>
            </div>
            <em>Скоро</em>
            <Lock size={16} />
          </article>
          <article className="disabled">
            <span>
              <SourceLogo brand="okx" size={30} />
            </span>
            <div>
              <strong>OKX</strong>
              <small>Будет доступен только с полноценной поддержкой истории.</small>
            </div>
            <em>Скоро</em>
            <Lock size={16} />
          </article>
          <article className="disabled">
            <span>
              <FileCsv size={27} />
            </span>
            <div>
              <strong>CSV</strong>
              <small>Проверяем сопоставление полей и защиту от дублей.</small>
            </div>
            <em>Скоро</em>
            <Lock size={16} />
          </article>
        </div>
        <footer>
          <Info size={16} />
          Автоимпорт включён всегда. Ручное добавление сделок можно отдельно показать в настройках.
        </footer>
      </section>

      <AnimatePresence>
        {sheetOpen ? (
          <>
            <motion.button
              type="button"
              className="premium-sheet-backdrop"
              aria-label="Закрыть подключение"
              onClick={closeSheet}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="premium-connect-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Подключить Bybit"
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 48 }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            >
              <header>
                <div>
                  <SourceLogo brand="bybit" size={29} />
                  <span>
                    <small>Read-only подключение</small>
                    <h2>Подключить Bybit</h2>
                  </span>
                </div>
                <button type="button" onClick={closeSheet} aria-label="Закрыть" autoFocus>
                  <X size={20} />
                </button>
              </header>

              <div className="premium-connect-progress" aria-label="Этап подключения">
                {[
                  ['access', '1', 'Доступ'],
                  ['verified', '2', 'Проверка'],
                  ['import', '3', 'Импорт'],
                ].map(([value, number, text], index) => {
                  const order = ['access', 'verified', 'import'];
                  const current = order.indexOf(sheetStep);
                  const itemIndex = order.indexOf(value);
                  return (
                    <div
                      key={value}
                      className={
                        itemIndex === current ? 'active' : itemIndex < current ? 'done' : ''
                      }
                    >
                      <span>{itemIndex < current ? <Check size={14} /> : number}</span>
                      <strong>{text}</strong>
                      {index < 2 ? <i /> : null}
                    </div>
                  );
                })}
              </div>

              {sheetStep === 'import' ? (
                <div className="premium-connect-success">
                  <span>
                    <CheckCircle size={30} weight="fill" />
                  </span>
                  <h3>Источник подключён</h3>
                  <p>
                    Первый импорт уже запущен. Финальные сделки и текущий баланс появятся после
                    нормализации истории.
                  </p>
                  <div>
                    <Clock size={17} />
                    Дальше Tradeum будет синхронизировать данные каждые 60 минут.
                  </div>
                  <button type="button" onClick={closeSheet}>
                    Готово
                  </button>
                </div>
              ) : (
                <div className="premium-connect-body">
                  <div className="premium-connect-form">
                    <label>
                      Название подключения
                      <input
                        value={label}
                        onChange={(event) => setLabel(event.target.value)}
                        placeholder="Bybit основной"
                      />
                      <small>Поможет различать источники в отчётах.</small>
                    </label>
                    <label>
                      API key
                      <span>
                        <Key size={16} />
                        <input
                          value={apiKey}
                          onChange={(event) => {
                            setApiKey(event.target.value);
                            setValidation({ status: 'idle' });
                            setSheetStep('access');
                          }}
                          autoComplete="off"
                          placeholder="Введите API key"
                        />
                      </span>
                    </label>
                    <label>
                      API secret
                      <span>
                        <Lock size={16} />
                        <input
                          value={apiSecret}
                          onChange={(event) => {
                            setApiSecret(event.target.value);
                            setValidation({ status: 'idle' });
                            setSheetStep('access');
                          }}
                          type={showSecret ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Введите API secret"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret((value) => !value)}
                          aria-label={showSecret ? 'Скрыть секрет' : 'Показать секрет'}
                        >
                          {showSecret ? <EyeSlash size={17} /> : <Eye size={17} />}
                        </button>
                      </span>
                      <small>Секрет шифруется на сервере и не возвращается в браузер.</small>
                    </label>
                    <label>
                      Импортировать с
                      <span>
                        <CalendarBlank size={16} />
                        <input
                          type="date"
                          min={bybitHistoryMinDate()}
                          max={today()}
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                        />
                      </span>
                      <small>Bybit предоставляет execution history максимум за 2 года.</small>
                    </label>
                    <div className="premium-sync-static">
                      <span>
                        <ArrowClockwise size={17} />
                      </span>
                      <div>
                        <strong>Каждые 60 минут</strong>
                        <small>Автоматическая синхронизация всегда включена.</small>
                      </div>
                      <CheckCircle size={18} weight="fill" />
                    </div>

                    {validation.status === 'invalid' ? (
                      <div className="premium-validation-message invalid">
                        <XCircle size={18} />
                        <span>
                          <strong>Проверка не пройдена</strong>
                          <small>{validation.error}</small>
                        </span>
                      </div>
                    ) : null}
                    {validation.status === 'valid' ? (
                      <div className="premium-validation-message valid">
                        <CheckCircle size={18} weight="fill" />
                        <span>
                          <strong>Подключение проверено</strong>
                          <small>
                            Read-only подтверждён · Текущий баланс:{' '}
                            {validation.balance === undefined
                              ? 'получен'
                              : formatUSD(validation.balance)}
                          </small>
                          <small>
                            {validation.ipBound
                              ? 'IP-ограничение ключа включено'
                              : 'Совет: ограничьте ключ IP-адресом сервера'}
                          </small>
                        </span>
                      </div>
                    ) : null}

                    <div className="premium-connect-actions">
                      <button type="button" onClick={closeSheet} disabled={adding}>
                        Отмена
                      </button>
                      {validation.status === 'valid' ? (
                        <button type="button" onClick={() => void connectBybit()} disabled={adding}>
                          {adding ? 'Подключаем…' : 'Подключить и импортировать'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void validateConnection()}
                          disabled={validation.status === 'checking'}
                        >
                          {validation.status === 'checking' ? (
                            <>
                              <ArrowClockwise size={17} className="spin" /> Проверяем…
                            </>
                          ) : (
                            <>
                              Проверить подключение <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <a
                      href="https://www.bybit.com/app/user/api-management"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Как создать ключ в Bybit <ArrowRight size={14} />
                    </a>
                  </div>

                  <aside className="premium-connect-security">
                    <header>
                      <span>
                        <ShieldCheck size={21} />
                      </span>
                      <div>
                        <h3>Только чтение</h3>
                        <p>
                          Перед сохранением Tradeum проверяет системный флаг Read-Only через Bybit.
                        </p>
                      </div>
                    </header>
                    <ul>
                      <li>
                        <CheckCircle size={16} /> Создайте отдельный API-ключ
                      </li>
                      <li>
                        <CheckCircle size={16} /> Разрешите только Read-Only
                      </li>
                      <li>
                        <CheckCircle size={16} /> Не включайте вывод средств
                      </li>
                      <li>
                        <CheckCircle size={16} /> Ограничьте ключ по IP при возможности
                      </li>
                    </ul>
                    <div className="premium-permission-list">
                      <strong>Права доступа</strong>
                      <span>
                        <CheckCircle size={15} /> Чтение сделок <em>требуется</em>
                      </span>
                      <span>
                        <CheckCircle size={15} /> Чтение баланса <em>требуется</em>
                      </span>
                      <span className="denied">
                        <XCircle size={15} /> Торговля <em>запрещена</em>
                      </span>
                      <span className="denied">
                        <XCircle size={15} /> Вывод средств <em>запрещён</em>
                      </span>
                    </div>
                    <footer>
                      <Lock size={15} />
                      Пароль от аккаунта Bybit никогда не запрашивается.
                    </footer>
                  </aside>
                </div>
              )}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
