import { memo } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';

import type { JSX } from 'react';

interface HighlightTextProps {
  readonly text: string;
  readonly highlight: string;
}

export const HighlightText = memo<HighlightTextProps>(({ text, highlight }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  if (!highlight.trim() || !text) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className={`rounded bg-yellow-500/30 px-1 text-${theme.infoFg}`}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
});
