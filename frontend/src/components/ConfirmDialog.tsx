import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonValue?: string;
  onReasonChange?: (val: string) => void;
  minReasonLength?: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'primary',
  requireReason = false,
  reasonLabel = 'Reason', reasonPlaceholder = 'Enter explanation…',
  reasonValue = '', onReasonChange,
  minReasonLength = 5,
  loading = false,
  onConfirm, onCancel,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen && !loading) onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const isReasonValid = !requireReason || (reasonValue.trim().length >= minReasonLength);

  const confirmStyle: React.CSSProperties =
    variant === 'danger'   ? { backgroundColor: 'var(--danger)',  borderColor: 'var(--danger)',  color: '#fff' } :
    variant === 'warning'  ? { backgroundColor: 'var(--warning)', borderColor: 'var(--warning)', color: '#fff' } :
    { backgroundColor: 'var(--success)', borderColor: 'var(--success)', color: '#fff' };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(variant === 'danger' || variant === 'warning') && (
              <AlertTriangle size={15} style={{ color: variant === 'danger' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
            )}
            <h3 id="confirm-title" style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button type="button" disabled={loading} onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{description}</div>
          {requireReason && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                {reasonLabel} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea rows={3} value={reasonValue} onChange={e => onReasonChange?.(e.target.value)}
                placeholder={reasonPlaceholder} disabled={loading}
                className="input" style={{ resize: 'vertical', height: '5rem' }} />
              {requireReason && reasonValue.trim().length < minReasonLength && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--danger)' }}>
                  Min {minReasonLength} chars ({reasonValue.trim().length}/{minReasonLength})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1.125rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
          <button type="button" disabled={loading} onClick={onCancel} className="btn btn-secondary">{cancelLabel}</button>
          <button type="button" disabled={loading || !isReasonValid} onClick={onConfirm}
            className="btn" style={confirmStyle}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
