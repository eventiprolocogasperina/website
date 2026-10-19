import { cn } from './cn';

export type AvatarProps = {
  /** Nome della persona: genera le iniziali e il testo alternativo. */
  name: string;
  /** Immagine opzionale. */
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Avatar rotondo con iniziali. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const dims = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-caption', lg: 'h-10 w-10 text-label' }[size];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-info-bg font-semibold text-info', dims, className)}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar piccoli, spesso da URL esterni
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-label={name} role="img">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
