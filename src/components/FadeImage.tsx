import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export interface FadeImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export function FadeImage({
  src,
  alt,
  className = '',
  containerClassName = '',
}: FadeImageProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-[#E5EAE7] dark:bg-[#1B2E25] ${containerClassName}`}
    >
      {(!loaded || failed) && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-[#7A8F83] dark:text-[#668274]"
        >
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
      {!failed && (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`transition-opacity duration-200 motion-reduce:transition-none ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        />
      )}
    </div>
  );
}
