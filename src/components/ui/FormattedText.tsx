import React from 'react';

interface FormattedTextProps {
  text: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
}

export default function FormattedText({ 
  text, 
  as: Component = 'span', 
  className = '',
  style = {}
}: FormattedTextProps) {
  if (!text) return null;

  // Sostituisce **testo** con <strong>testo</strong>,
  // *testo* con <i>testo</i> e [testo](url) con link <a>
  const formattedHtml = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: currentColor; text-decoration: underline; font-weight: 600;" class="hover:opacity-80">$1</a>');

  return (
    <Component 
      className={className} 
      style={style} 
      dangerouslySetInnerHTML={{ __html: formattedHtml }} 
    />
  );
}
