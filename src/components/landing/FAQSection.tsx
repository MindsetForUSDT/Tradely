import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';

const faqs = [
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
    q: 'Безопасны ли мои данные?',
    a: 'Все адреса шифруются. RLS гарантирует доступ только владельцу.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-cyber-700/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm md:text-base font-medium pr-4 group-hover:text-neon-cyan transition-colors">
          {question}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted shrink-0"
        >
          <Icon name="wallet-add" size={20} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
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
  return (
    <section id="faq" className="py-20 md:py-32 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
            Часто задаваемые <span className="text-gradient">вопросы</span>
          </h2>
        </div>
        <div className="glass-card p-1">
          <div className="bg-cyber-950/90 rounded-2xl p-4 md:p-6">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
        <p className="text-center text-sm text-text-muted mt-8">
          Не нашли ответ?{' '}
          <a href="mailto:info@tradeumdiary.ru" className="text-neon-cyan hover:underline">
            info@tradeumdiary.ru
          </a>
        </p>
      </div>
    </section>
  );
}
