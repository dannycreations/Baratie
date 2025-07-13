import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly logicalLines: readonly string[];
  readonly showLineNumbers: boolean;
  readonly textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useLineNumber({ textAreaRef, logicalLines, showLineNumbers }: LineNumberProps): readonly (number | null)[] {
  const [lineNumbers, setLineNumbers] = useState<readonly (number | null)[]>([]);
  const linesRef = useRef(logicalLines);
  linesRef.current = logicalLines;

  const calculate = useCallback(() => {
    const textarea = textAreaRef.current;
    if (!showLineNumbers || !textarea) {
      setLineNumbers([]);
      return;
    }

    const currentLines = linesRef.current;
    const styles = window.getComputedStyle(textarea);
    const font = styles.font;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let charWidth = 8;
    if (context) {
      context.font = font;
      charWidth = context.measureText('M').width;
    }
    if (charWidth <= 0) {
      setLineNumbers(currentLines.map((_, i) => i + 1));
      return;
    }

    const xPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const contentWidth = textarea.clientWidth - xPadding;
    if (contentWidth <= 0) {
      setLineNumbers(currentLines.map((_, i) => i + 1));
      return;
    }

    const maxLineChars = Math.floor(contentWidth / charWidth);
    if (maxLineChars <= 0) {
      setLineNumbers(currentLines.map((_, i) => i + 1));
      return;
    }

    const visualLines = currentLines.map((line) => Math.max(1, Math.ceil(line.length / maxLineChars)));
    const lineSums: number[] = [];
    visualLines.reduce((accumulator, value) => {
      const newTotal = accumulator + value;
      lineSums.push(newTotal);
      return newTotal;
    }, 0);

    const totalLines = lineSums.length > 0 ? lineSums[lineSums.length - 1] : 0;
    if (totalLines === 0 && currentLines.length > 0) {
      setLineNumbers([1]);
      return;
    }

    const finalNumbers: (number | null)[] = [];
    let lastLineIndex = -1;
    for (let visualLineIndex = 1; visualLineIndex <= totalLines; visualLineIndex++) {
      const logicalLineIndex = lineSums.findIndex((sum) => visualLineIndex <= sum);
      if (logicalLineIndex !== lastLineIndex) {
        finalNumbers.push(logicalLineIndex + 1);
      } else {
        finalNumbers.push(null);
      }
      lastLineIndex = logicalLineIndex;
    }
    setLineNumbers(finalNumbers);
  }, [showLineNumbers]);

  useLayoutEffect(() => {
    calculate();
  }, [logicalLines, calculate]);

  useLayoutEffect(() => {
    const textarea = textAreaRef.current;
    if (!showLineNumbers || !textarea) {
      return;
    }

    document.fonts.ready.then(calculate).catch(() => calculate());

    const resizeObserver = new ResizeObserver(calculate);
    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showLineNumbers, textAreaRef, calculate]);

  return lineNumbers;
}
