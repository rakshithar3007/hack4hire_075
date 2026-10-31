import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => (
  <div
    aria-hidden="true"
    className={className}
    style={{
      backgroundColor: 'var(--border)',
      borderRadius: '4px',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }}
  />
);
