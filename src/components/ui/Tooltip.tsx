import { useState } from 'react';
import { Icon } from './Icons';

interface TooltipProps {
  content: string;
}

export function Tooltip({ content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="w-4 h-4 rounded-full bg-surface-border flex items-center justify-center text-text-muted hover:bg-accent-green/20 hover:text-accent-green transition-all duration-200">
        <Icon name="info" size={10} />
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-surface-elevated border border-surface-border rounded-xl shadow-lg z-50 text-xs text-text-secondary leading-relaxed text-center animate-in fade-in zoom-in-95 duration-200">
          {content}
        </span>
      )}
    </span>
  );
}
