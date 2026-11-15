import { Skeleton } from './Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  widths?: string[];
  className?: string;
}

const DEFAULT_WIDTHS = ['60%', '80%', '45%', '72%', '55%'];

export function SkeletonText({
  lines = 3,
  widths = DEFAULT_WIDTHS,
  className = '',
}: SkeletonTextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-busy="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          height={12}
          width={widths[idx % widths.length]}
          rounded="sm"
        />
      ))}
    </div>
  );
}
