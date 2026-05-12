import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';

const faqs = [
  {
    q: 'Как подключить кошелек?',
    a: 'Перейдите в раздел "Кошельки", нажмите "Добавить кошелёк", введите публичный адрес вашего EVM или Solana кошелька. Мы не запрашиваем приватные ключи — только публичные адреса для чтения истории транзакций.',
  },
  {
    q: 'Безопасны ли мои данные?',
    a: 'Абсолютно. Мы используем AES-256 шифрование для всех данных. API ключи хранятся в зашифрованном виде. Мы не имеем доступа к вашим средствам — только к публичной истории транзакций.',
  },
  {
    q: 'Есть ли пробный период PRO?',
    a: 'Да! При регистрации вы получаете 7 дней бесплатного доступа ко всем PRO функциям. Без привязки карты. По истечении срока вы автоматически переходите на бесплатный тариф.',
  },
  {
    q: 'Какие блокчейны поддерживаются?',
    a: 'Ethereum, Solana, Polygon, BSC, Arbitrum, Optimism, Avalanche, Base.',
  },
  {
    q: 'Нужно ли предоставлять приватный ключ?',
    a: 'Нет. Только публичный адрес. Приватные ключи никогда не запрашиваются.',
  },
  { q: 'Как часто обновляются данные?', a: 'Новые кошельки — 5 минут. Существующие — каждый час.' },
  {
    q: 'Можно ли экспортировать данные?',
    a: 'Да, на всех тарифах доступен экспорт в CSV. На PRO тарифе — дополнительно Excel и PDF с налоговыми отчётами.',
  },
  {
    q: 'Как отменить подписку?',
    a: 'Подписку можно отменить в любой момент в разделе "Настройки → Подписка". Доступ к PRO функциям сохраняется до конца оплаченного периода.',
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-cyber-700/30 last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-5 text-left group min-h-[56px]"
        aria-expanded={isOpen}
      >
        <span className="text-sm md:text-base font-medium pr-4 group-hover:text-neon-cyan transition-colors">
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted shrink-0"
        >
          <Icon name="chevron-down" size={20} />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-secondary pb-5 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [search]);

  return (
    <section id="faq" className="py-20 md:py-32 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
            Часто задаваемые <span className="text-gradient">вопросы</span>
          </h2>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по вопросам..."
            className="w-full px-4 py-3 pl-11 rounded-xl bg-cyber-800/50 border border-cyber-700/50 text-white placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30 transition-all"
          />
          <Icon
            name="search"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
        </div>

        <div className="glass-card p-1">
          <div className="bg-cyber-950/90 rounded-2xl p-4 md:p-6">
            {filtered.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-text-muted py-8">Ничего не найдено</p>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-text-muted mt-8">
          Не нашли ответ?{' '}
          <a
            href="https://t.me/tradeumdiary_support"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-cyan hover:underline"
          >
            Напишите нам в Telegram
          </a>
        </p>
      </div>
    </section>
  );
}
