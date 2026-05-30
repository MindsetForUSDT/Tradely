import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ title, onClose, children, size = 'lg' }: ModalProps) {
  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Блокировка скролла body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'w-full bg-surface-100 rounded-2xl shadow-2xl overflow-hidden',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-border transition-colors text-text-secondary hover:text-text-primary"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
