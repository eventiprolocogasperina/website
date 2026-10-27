import type { CSSProperties, ReactNode } from 'react';
import { brandThemeStyle } from '@/lib/edition-theme';
import { Avvisami } from './Avvisami';
import { Galleria, Recensioni, Sponsor } from './Community';
import { Countdown } from './Countdown';
import { CTAAcquistoBlock, Prezzi } from './CTAAcquisto';
import { Edizioni } from './Edizioni';
import { Allegati, Mappa, NumeriChiave, Video } from './Extras';
import { FAQ } from './FAQ';
import { Hero } from './Hero';
import { Programma } from './Programma';
import { RichText } from './RichText';
import { Ricordi } from './Ricordi';
import { Schede } from './Schede';
import type { Block } from './schema';
import { Tappe } from './Tappe';
import type { BlockData } from './types';

/** Un blocco: sceglie il componente dal tipo. Non ha stato, quindi va bene nella pagina e nell'anteprima. */
export function RenderBlock({ block, data }: { block: Block; data: BlockData }): ReactNode {
  switch (block.type) {
    case 'Hero':
      return <Hero props={block.props} data={data} />;
    case 'RichText':
      return <RichText props={block.props} />;
    case 'Programma':
      return <Programma props={block.props} />;
    case 'Prezzi':
      return <Prezzi props={block.props} data={data} />;
    case 'CTAAcquisto':
      return <CTAAcquistoBlock props={block.props} data={data} />;
    case 'FAQ':
      return <FAQ props={block.props} />;
    case 'Mappa':
      return <Mappa props={block.props} />;
    case 'Galleria':
      return <Galleria props={block.props} data={data} />;
    case 'Video':
      return <Video props={block.props} />;
    case 'Sponsor':
      return <Sponsor props={block.props} data={data} />;
    case 'Countdown':
      return <Countdown props={block.props} />;
    case 'Allegati':
      return <Allegati props={block.props} />;
    case 'Recensioni':
      return <Recensioni props={block.props} data={data} />;
    case 'NumeriChiave':
      return <NumeriChiave props={block.props} />;
    case 'Tappe':
      return <Tappe props={block.props} />;
    case 'Schede':
      return <Schede props={block.props} />;
    case 'Edizioni':
      return <Edizioni props={block.props} data={data} />;
    case 'Avvisami':
      return <Avvisami props={block.props} data={data} />;
    case 'Ricordi':
      return <Ricordi props={block.props} data={data} />;
  }
}

/**
 * Pagina a blocchi con i colori del format (§14.3): fondo del format, testo scuro e Cormorant per i
 * titoli. Resta chiara anche col sito in tema scuro, come le pagine d'acquisto (EventPageShell).
 * `@container` fa sì che i blocchi si adattino alla larghezza della pagina o dell'anteprima.
 */
export function BlockPage({ blocks, data, theme, style }: { blocks: Block[]; data: BlockData; theme: string | null; style?: CSSProperties }) {
  const visible = blocks.filter((b) => !b.hidden);
  // L'ancora #acquista (pulsanti della copertina) va al primo blocco Acquista della pagina.
  const anchor = visible.find((b) => b.type === 'CTAAcquisto')?.id;
  return (
    <div data-theme="light" className="ui-root @container relative min-h-screen overflow-x-clip bg-[var(--brand-surface)] text-[var(--brand-ink)]" style={{ ...brandThemeStyle(theme), ...style }}>
      {visible.map((b) => (
        <div key={b.id} data-block={b.type} {...(b.id === anchor ? { id: 'acquista', className: 'scroll-mt-28' } : {})}>
          <RenderBlock block={b} data={data} />
        </div>
      ))}
    </div>
  );
}
