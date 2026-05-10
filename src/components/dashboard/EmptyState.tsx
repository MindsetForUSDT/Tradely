import { GlowButton } from '@/components/ui/GlowButton';
import { Icon } from '@/components/ui/Icons';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; to: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center mb-6">
        <Icon name={icon as any} size={36} className="text-neon-cyan/40" />
      </div>
      <h3 className="text-lg font-display font-semibold mb-2">{title}</h3>
      <p className="text-text-muted text-sm max-w-sm mb-6">{description}</p>
      {action && (
        <Link to={action.to}>
          <GlowButton variant="outline" size="sm">
            <Icon name="wallet-add" size={14} />
            {action.label}
          </GlowButton>
        </Link>
      )}
    </div>
  );
}
