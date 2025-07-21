import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly logicalLines: readonly string[];
  readonly scrollTop: number;
  readonly showLineNumbers: boolean;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
}

interface LineMetric {
  readonly number: number;
  readonly count: number;
}

interface VirtualItem {
  readonly key: number;
  readonly number: number | null;
}

interface VirtualResult {
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly visibleItems: readonly VirtualItem[];
}

function findStartLogicalLineIndex(prefixSum: readonly number[], targetVisualLine: number): number {
  let low = 0;
  let high = prefixSum.length - 1;
  let resultIndex = prefixSum.length;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (prefixSum[mid] >= targetVisualLine) {
      resultIndex = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return resultIndex;
}

export function useLineNumber({ textareaRef, logicalLines, showLineNumbers, scrollTop }: LineNumberProps): VirtualResult {
  const [lineMetrics, setLineMetrics] = useState<readonly LineMetric[]>([]);
  const [visualLinePrefixSum, setVisualLinePrefixSum] = useState<readonly number[]>([]);
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
      setLineMetrics([]);
      setVisualLinePrefixSum([]);
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
      const newMetrics = logicalLines.map((_, i) => ({ number: i + 1, count: 1 }));
      setLineMetrics(newMetrics);
      setVisualLinePrefixSum(newMetrics.map((_, i) => i + 1));
      return;
    }

    const newMetrics: LineMetric[] = [];
    const newPrefixSum: number[] = [];
    let visualLineCount = 0;
    for (let i = 0; i < logicalLines.length; i++) {
      const line = logicalLines[i];
      const count = Math.max(1, Math.ceil(line.length / maxLineChars));
      newMetrics.push({ number: i + 1, count });
      visualLineCount += count;
      newPrefixSum.push(visualLineCount);
    }
    setLineMetrics(newMetrics);
    setVisualLinePrefixSum(newPrefixSum);
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

  return useMemo((): VirtualResult => {
    if (!showLineNumbers || !textareaRef.current || lineHeightRef.current === 0) {
      return { paddingTop: 0, paddingBottom: 0, visibleItems: [] };
    }
    const lineHeight = lineHeightRef.current;
    const { clientHeight } = textareaRef.current;
    const totalVisualLines = visualLinePrefixSum.length > 0 ? visualLinePrefixSum[visualLinePrefixSum.length - 1] : 0;

    if (totalVisualLines === 0) {
      return { paddingTop: 0, paddingBottom: 0, visibleItems: [] };
    }

    const buffer = 10;
    const startIndex = Math.max(0, Math.floor(scrollTop / lineHeight) - buffer);
    const endIndex = Math.min(totalVisualLines, Math.ceil((scrollTop + clientHeight) / lineHeight) + buffer);

    const visibleItems: { key: number; number: number | null }[] = [];
    if (startIndex < endIndex) {
      const startLogicalIndex = findStartLogicalLineIndex(visualLinePrefixSum, startIndex + 1);
      let currentVisualLine = startLogicalIndex > 0 ? visualLinePrefixSum[startLogicalIndex - 1] : 0;

      for (let logicalIndex = startLogicalIndex; logicalIndex < lineMetrics.length; logicalIndex++) {
        const metric = lineMetrics[logicalIndex];
        if (!metric) continue;

        for (let i = 0; i < metric.count; i++) {
          const visualIndex = currentVisualLine + i;
          if (visualIndex >= startIndex && visualIndex < endIndex) {
            visibleItems.push({
              key: visualIndex,
              number: i === 0 ? metric.number : null,
            });
          }
        }

        currentVisualLine += metric.count;
        if (currentVisualLine >= endIndex) {
          break;
        }
      }
    }

    const paddingTop = startIndex * lineHeight;
    const paddingBottom = Math.max(0, (totalVisualLines - endIndex) * lineHeight);
    return { paddingTop, paddingBottom, visibleItems };
  }, [showLineNumbers, textareaRef, lineMetrics, scrollTop, visualLinePrefixSum]);
}
