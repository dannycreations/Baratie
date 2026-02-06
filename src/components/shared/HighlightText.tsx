import { memo, useMemo } from 'react';

import type { JSX } from 'react';

interface HighlightTextProps {
  readonly text: string;
  readonly highlight: string;
}

export const HighlightText = memo<HighlightTextProps>(({ text, highlight }): JSX.Element => {
  const parts = useMemo(() => {
    const trimmedHighlight = highlight.trim();
    if (!trimmedHighlight || !text) {
      return null;
    }
    const escaped = trimmedHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.split(regex);
  }, [text, highlight]);

  if (!parts) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="highlight-mark">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
});
