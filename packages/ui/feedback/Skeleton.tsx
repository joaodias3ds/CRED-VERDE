import React from 'react';
import { strings } from '../strings';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const radiusMap = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={strings.lista.carregando}
      className={`cv-skeleton ${radiusMap[rounded]} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...rest}
    >
      <span className="sr-only">{strings.lista.carregando}</span>
    </div>
  );
}
