import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md bg-surface-default border border-surface-border rounded-xl shadow-2xl p-6">
              {/* Заголовок */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Связаться с нами</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
                  aria-label="Закрыть"
                >
                  <Icon name="close" size={20} className="text-text-secondary" />
                </button>
              </div>

              {/* Описание */}
              <p className="text-text-secondary text-sm mb-6">
                Выберите удобный способ связи. Мы ответим в течение 24 часов.
              </p>

              {/* Контакты */}
              <div className="space-y-3">
                {/* Telegram */}
                <a
                  href="https://t.me/tradeumdiary_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-lg bg-surface-elevated border border-surface-border hover:border-accent-indigo/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#229ED9]/10 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42l10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.002.001l-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15l4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary font-medium">Telegram</p>
                    <p className="text-text-muted text-xs">@tradeumdiary_support</p>
                  </div>
                  <Icon
                    name="import"
                    size={16}
                    className="text-text-muted group-hover:text-accent-indigo transition-colors"
                  />
                </a>

                {/* Email */}
                <a
                  href="mailto:support@tradeumdiary.com"
                  className="flex items-center gap-4 p-4 rounded-lg bg-surface-elevated border border-surface-border hover:border-accent-indigo/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-indigo/10 flex items-center justify-center">
                    <Icon name="shield" size={20} className="text-accent-indigo" />
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary font-medium">Email</p>
                    <p className="text-text-muted text-xs">support@tradeumdiary.com</p>
                  </div>
                  <Icon
                    name="import"
                    size={16}
                    className="text-text-muted group-hover:text-accent-indigo transition-colors"
                  />
                </a>

                {/* WhatsApp (опционально) */}
                <a
                  href="https://wa.me/79000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-lg bg-surface-elevated border border-surface-border hover:border-accent-indigo/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17.472 17.29c-.275-.138-1.632-.808-1.885-.9-.254-.092-.438-.138-.623.139-.184.277-.713.9-.875 1.083-.163.185-.325.196-.6.058-.275-.139-1.161-.428-2.216-1.367-.82-.73-1.373-1.633-1.534-1.911-.162-.278-.017-.428.121-.566.124-.124.276-.325.414-.487.139-.162.184-.277.276-.461.092-.185.046-.347-.023-.486-.069-.139-.623-1.497-.854-2.051-.224-.537-.453-.463-.623-.471-.162-.008-.347-.009-.532-.009-.184 0-.481.069-.734.347-.253.278-.966.945-.966 2.3 0 1.359.99 2.665 1.128 2.85.139.185 1.946 2.974 4.715 4.168 1.936.836 2.428.696 3.04.637.613-.059 1.632-.607 1.84-.173.207.434.69 1.583.932 1.98.241.396.427.396.645.368.219-.028 1.497-.69 1.762-1.433.264-.742.264-1.373.185-1.501-.08-.129-.29-.208-.566-.347z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary font-medium">WhatsApp</p>
                    <p className="text-text-muted text-xs">+7 (900) 000-00-00</p>
                  </div>
                  <Icon
                    name="import"
                    size={16}
                    className="text-text-muted group-hover:text-accent-indigo transition-colors"
                  />
                </a>
              </div>

              {/* Footer */}
              <p className="text-text-muted text-xs text-center mt-6">
                Работаем с 9:00 до 21:00 МСК
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
