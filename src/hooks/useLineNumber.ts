import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly logicalLines: readonly string[];
  readonly showLineNumbers: boolean;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useLineNumber({ textareaRef, logicalLines, showLineNumbers }: LineNumberProps): readonly (number | null)[] {
  const [lineNumbers, setLineNumbers] = useState<readonly (number | null)[]>([]);
  const linesRef = useRef(logicalLines);
  linesRef.current = logicalLines;

  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

  const getCanvasContext = useCallback((): CanvasRenderingContext2D | null => {
    if (!canvasContextRef.current) {
      const canvas = document.createElement('canvas');
      canvasContextRef.current = canvas.getContext('2d');
    }
    return canvasContextRef.current;
  }, []);

  const calculate = useCallback(() => {
    const textarea = textareaRef.current;
    if (!showLineNumbers || !textarea) {
      setLineNumbers([]);
      return;
    }
    const currentLines = linesRef.current;
    const styles = window.getComputedStyle(textarea);
    const font = styles.font;
    const context = getCanvasContext();
    let charWidth = 8;
    if (context) {
      context.font = font;
      charWidth = context.measureText('M').width;
    }
    const xPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const contentWidth = textarea.clientWidth - xPadding;
    const maxLineChars = charWidth > 0 ? Math.floor(contentWidth / charWidth) : 0;
    if (maxLineChars <= 0) {
      setLineNumbers(currentLines.map((_, i) => i + 1));
      return;
    }
    const finalNumbers: (number | null)[] = [];
    for (let i = 0; i < currentLines.length; i++) {
      finalNumbers.push(i + 1);
      const line = currentLines[i];
      const visualLineCount = Math.max(1, Math.ceil(line.length / maxLineChars));
      for (let j = 1; j < visualLineCount; j++) {
        finalNumbers.push(null);
      }
    }
    setLineNumbers(finalNumbers);
  }, [showLineNumbers, textareaRef, getCanvasContext]);

  useLayoutEffect(() => {
    calculate();
  }, [logicalLines, calculate]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!showLineNumbers || !textarea) {
      return;
    }
    document.fonts.ready.then(calculate).catch(() => calculate());
    const resizeObserver = new ResizeObserver(calculate);
    resizeObserver.observe(textarea);
    return () => {
      resizeObserver.disconnect();
    };
  }, [showLineNumbers, textareaRef, calculate]);

  return lineNumbers;
}
