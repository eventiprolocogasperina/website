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

  // Sostituisce **testo** con <strong>testo</strong>
  // e *testo* con <i>testo</i>
  const formattedHtml = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');

  return (
    <Component 
      className={className} 
      style={style} 
      dangerouslySetInnerHTML={{ __html: formattedHtml }} 
    />
  );
}
