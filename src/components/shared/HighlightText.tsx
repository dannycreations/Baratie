import { memo, useMemo } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';

import type { JSX } from 'react';

interface HighlightTextProps {
  readonly text: string;
  readonly highlight: string;
}

export const HighlightText = memo<HighlightTextProps>(({ text, highlight }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const trimmedHighlight = highlight.trim();

  const parts = useMemo(() => {
    if (!trimmedHighlight || !text) {
      return null;
    }
    const escaped = trimmedHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.split(regex);
  }, [text, trimmedHighlight]);

  if (!parts) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={`px-1 rounded bg-${theme.highlightBg} text-${theme.highlightFg}`}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
});
