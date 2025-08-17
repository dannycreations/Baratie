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

  const regex = useMemo(() => {
    if (!trimmedHighlight) {
      return null;
    }
    const escaped = trimmedHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(${escaped})`, 'gi');
  }, [trimmedHighlight]);

  if (!regex || !text) {
    return <>{text}</>;
  }

  const parts = text.split(regex);

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
