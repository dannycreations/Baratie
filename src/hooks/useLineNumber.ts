import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly logicalLines: readonly string[];
  readonly scrollTop: number;
  readonly showLineNumbers: boolean;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
}

interface VirtualizedResult {
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly visibleItems: readonly { readonly key: number; readonly number: number | null }[];
}

export function useLineNumber({ textareaRef, logicalLines, showLineNumbers, scrollTop }: LineNumberProps): VirtualizedResult {
  const [wrappedLineNumbers, setWrappedLineNumbers] = useState<readonly (number | null)[]>([]);
  const lineHeightRef = useRef(0);
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
      setWrappedLineNumbers([]);
      return;
    }
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
      setWrappedLineNumbers(logicalLines.map((_, i) => i + 1));
      return;
    }
    const finalNumbers: (number | null)[] = [];
    for (let i = 0; i < logicalLines.length; i++) {
      finalNumbers.push(i + 1);
      const line = logicalLines[i];
      const visualLineCount = Math.max(1, Math.ceil(line.length / maxLineChars));
      for (let j = 1; j < visualLineCount; j++) {
        finalNumbers.push(null);
      }
    }
    setWrappedLineNumbers(finalNumbers);
  }, [getCanvasContext, logicalLines, showLineNumbers, textareaRef]);

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

    const styles = window.getComputedStyle(textarea);
    const lh = parseFloat(styles.lineHeight);
    lineHeightRef.current = isNaN(lh) ? 24 : lh;

    return () => {
      resizeObserver.disconnect();
    };
  }, [showLineNumbers, textareaRef, calculate]);

  return useMemo((): VirtualizedResult => {
    if (!showLineNumbers || !textareaRef.current || lineHeightRef.current === 0) {
      return { paddingTop: 0, paddingBottom: 0, visibleItems: [] };
    }
    const lineHeight = lineHeightRef.current;
    const { clientHeight } = textareaRef.current;
    const totalLines = wrappedLineNumbers.length;
    if (totalLines === 0) {
      return { paddingTop: 0, paddingBottom: 0, visibleItems: [] };
    }
    const buffer = 10;
    const startIndex = Math.max(0, Math.floor(scrollTop / lineHeight) - buffer);
    const endIndex = Math.min(totalLines, Math.ceil((scrollTop + clientHeight) / lineHeight) + buffer);
    const visibleItems = [];
    for (let i = startIndex; i < endIndex; i++) {
      visibleItems.push({
        key: i,
        number: wrappedLineNumbers[i],
      });
    }
    const paddingTop = startIndex * lineHeight;
    const paddingBottom = (totalLines - endIndex) * lineHeight;
    return { paddingTop, paddingBottom, visibleItems };
  }, [showLineNumbers, textareaRef, wrappedLineNumbers, scrollTop]);
}
