import React from 'react';
import { inline } from '@/components/public/blocks/markup';

interface FormattedTextProps {
  text: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * **grassetto**, *corsivo* e [testo](url) resi come nodi React tramite il renderer dei blocchi:
 * il testo salvato dall'admin non diventa mai HTML, e i link `javascript:` restano testo.
 */
export default function FormattedText({ text, as: Component = 'span', className = '', style = {} }: FormattedTextProps) {
  if (!text) return null;
  return (
    <Component className={className} style={style}>
      {inline(text)}
    </Component>
  );
}
