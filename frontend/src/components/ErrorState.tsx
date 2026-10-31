import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'An error occurred while fetching data from the server.',
  onRetry,
  className = '',
}) => (
  <div role="alert" className={className}
    style={{ padding: '2rem', borderRadius: '8px', border: '1px solid var(--danger-border)', backgroundColor: 'var(--danger-bg)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--danger-border)', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', marginBottom: '0.75rem' }}>
      <AlertCircle size={18} />
    </div>
    <h4 style={{ margin: '0 0 0.375rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h4>
    <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '24rem' }}>{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
        <RefreshCw size={13} /> Retry
      </button>
    )}
  </div>
);
