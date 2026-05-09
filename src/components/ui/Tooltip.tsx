import { useState } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function Tooltip({ content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="w-3.5 h-3.5 rounded-full bg-surface-border text-[10px] flex items-center justify-center text-text-muted font-bold leading-none">
        ?
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-surface-elevated border border-surface-border rounded-xl shadow-2xl z-50 text-xs text-text-secondary leading-relaxed text-center">
          {content}
        </span>
      )}
    </span>
  );
}
