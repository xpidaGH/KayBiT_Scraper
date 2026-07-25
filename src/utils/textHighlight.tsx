import React from 'react';

interface HighlightTextProps {
  text?: string;
  highlight?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
  if (!text) return null;
  if (!highlight || !highlight.trim()) {
    return <>{text}</>;
  }

  const query = highlight.trim();
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-400/30 text-amber-200 font-semibold px-0.5 rounded border border-amber-400/50"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};
