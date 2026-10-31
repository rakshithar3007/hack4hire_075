import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records available',
  description = 'There is currently no data to display.',
  icon,
  action,
  actionLabel,
  onAction,
  className = '',
}) => {
  const btnLabel = action?.label || actionLabel;
  const btnClick = action?.onClick || onAction;

  return (
    <div className={className} style={{ padding: '3rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
        {icon || <Inbox size={18} />}
      </div>
      <h4 style={{ margin: '0 0 0.375rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h4>
      <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '24rem', lineHeight: 1.5 }}>{description}</p>
      {btnLabel && btnClick && (
        <button type="button" onClick={btnClick} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>{btnLabel}</button>
      )}
    </div>
  );
};
