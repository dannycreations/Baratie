import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly logicalLines: readonly string[];
  readonly showLineNumbers: boolean;
  readonly textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useLineNumber({ textAreaRef, logicalLines, showLineNumbers }: LineNumberProps): readonly (number | null)[] {
  const [lineNumbers, setLineNumbers] = useState<readonly (number | null)[]>([]);
  const logicalLinesRef = useRef(logicalLines);
  logicalLinesRef.current = logicalLines;

  const calculate = useCallback(() => {
    const textarea = textAreaRef.current;
    if (!showLineNumbers || !textarea) {
      setLineNumbers([]);
      return;
    }

    const currentLogicalLines = logicalLinesRef.current;
    const styles = window.getComputedStyle(textarea);
    const font = styles.font;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let characterWidth = 8;
    if (context) {
      context.font = font;
      characterWidth = context.measureText('M').width;
    }
    if (characterWidth <= 0) {
      setLineNumbers(currentLogicalLines.map((_, i) => i + 1));
      return;
    }

    const paddingHorizontal = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const contentWidth = textarea.clientWidth - paddingHorizontal;
    if (contentWidth <= 0) {
      setLineNumbers(currentLogicalLines.map((_, i) => i + 1));
      return;
    }

    const maxCharsPerLine = Math.floor(contentWidth / characterWidth);
    if (maxCharsPerLine <= 0) {
      setLineNumbers(currentLogicalLines.map((_, i) => i + 1));
      return;
    }

    const visualLinesPerLine = currentLogicalLines.map((line) => Math.max(1, Math.ceil(line.length / maxCharsPerLine)));
    const cumulativeLines: number[] = [];
    visualLinesPerLine.reduce((accumulator, value) => {
      const newTotal = accumulator + value;
      cumulativeLines.push(newTotal);
      return newTotal;
    }, 0);

    const totalLines = cumulativeLines.length > 0 ? cumulativeLines[cumulativeLines.length - 1] : 0;
    if (totalLines === 0 && currentLogicalLines.length > 0) {
      setLineNumbers([1]);
      return;
    }

    const finalNumbers: (number | null)[] = [];
    let lastLineIndex = -1;
    for (let visualLineIndex = 1; visualLineIndex <= totalLines; visualLineIndex++) {
      const logicalLineIndex = cumulativeLines.findIndex((sum) => visualLineIndex <= sum);
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
