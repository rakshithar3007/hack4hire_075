import React from 'react';

export type BadgeVariant =
  | 'APPROVED' | 'PASSED' | 'PASS' | 'LOW' | 'COMPLETED'
  | 'PENDING'
  | 'PROCESSING'
  | 'MEDIUM' | 'WARNING'
  | 'REJECTED' | 'FAILED' | 'FAIL'
  | 'HIGH' | 'ESCALATED' | 'MANUAL_INVESTIGATION'
  | 'NEUTRAL';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

type BadgeConfig = {
  bg: string;
  color: string;
  border: string;
  dot: string;   // dot colour class
};

function getConfig(status: string): BadgeConfig {
  switch (status.toUpperCase() as BadgeVariant) {
    case 'APPROVED':
    case 'PASSED':
    case 'PASS':
    case 'LOW':
    case 'COMPLETED':
      return { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)', dot: 'var(--success)' };

    case 'PENDING':
      return { bg: 'var(--surface-subtle)', color: 'var(--text-secondary)', border: 'var(--border)', dot: 'var(--text-muted)' };

    case 'PROCESSING':
      return { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-border)', dot: 'var(--info)' };

    case 'MEDIUM':
    case 'WARNING':
      return { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)', dot: 'var(--warning)' };

    case 'REJECTED':
    case 'FAILED':
    case 'FAIL':
      return { bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)', dot: 'var(--danger)' };

    case 'HIGH':
    case 'ESCALATED':
    case 'MANUAL_INVESTIGATION':
      return { bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'var(--danger-border)', dot: 'var(--danger)' };

    default:
      return { bg: 'var(--surface-subtle)', color: 'var(--text-muted)', border: 'var(--border)', dot: 'var(--text-muted)' };
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  customLabel,
  className = '',
}) => {
  const norm = (status || 'PENDING').toUpperCase();
  const label = customLabel || status || 'Pending';
  const cfg = getConfig(norm);

  const isPulsing = norm === 'PROCESSING' || norm === 'HIGH' || norm === 'ESCALATED' || norm === 'MANUAL_INVESTIGATION';

  const px  = size === 'sm' ? '0.5rem'   : '0.625rem';
  const py  = size === 'sm' ? '0.125rem' : '0.1875rem';
  const fs  = size === 'sm' ? '0.6875rem': '0.75rem';
  const dot = size === 'sm' ? 5 : 6;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3125rem',
        padding: `${py} ${px}`,
        borderRadius: '100px',
        border: `1px solid ${cfg.border}`,
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: fs,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: dot, height: dot,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          flexShrink: 0,
          ...(isPulsing ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
        }}
      />
      {label}
    </span>
  );
};
