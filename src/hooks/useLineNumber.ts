import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly value: string;
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
  readonly lineHeight: number;
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly visibleItems: ReadonlyArray<VirtualItem>;
}

function findStartLogicalLineIndex(prefixSum: ReadonlyArray<number>, targetVisualLine: number): number {
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

export function useLineNumber({ textareaRef, value, showLineNumbers, scrollTop }: LineNumberProps): VirtualResult {
  const [lineMetrics, setLineMetrics] = useState<ReadonlyArray<LineMetric>>([]);
  const [visualLinePrefixSum, setVisualLinePrefixSum] = useState<ReadonlyArray<number>>([]);
  const lineHeightRef = useRef(0);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

  const getCanvasContext = useCallback((): CanvasRenderingContext2D | null => {
    if (!canvasContextRef.current) {
      const canvas = document.createElement('canvas');
      canvasContextRef.current = canvas.getContext('2d');
    }
    return canvasContextRef.current;
  }, []);

  const calculate = useCallback(
    (currentValue: string) => {
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

      const lines = currentValue.split('\n');
      const newPrefixSum: Array<number> = [];
      let visualLineCount = 0;

      const newMetrics = lines.map((line, index) => {
        const lineLength = line.length;
        const count = maxLineChars > 0 ? Math.max(1, Math.ceil(lineLength / maxLineChars)) : 1;
        visualLineCount += count;
        newPrefixSum.push(visualLineCount);
        return { number: index + 1, count };
      });

      setLineMetrics(newMetrics);
      setVisualLinePrefixSum(newPrefixSum);
    },
    [getCanvasContext, showLineNumbers, textareaRef],
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!showLineNumbers || !textarea) {
      return;
    }

    const handleCalculate = () => calculate(textarea.value);

    document.fonts.ready.then(handleCalculate).catch(handleCalculate);
    const resizeObserver = new ResizeObserver(handleCalculate);
    resizeObserver.observe(textarea);

    const styles = window.getComputedStyle(textarea);
    const lh = parseFloat(styles.lineHeight);
    lineHeightRef.current = isNaN(lh) ? 24 : lh;

    return () => {
      resizeObserver.disconnect();
    };
  }, [showLineNumbers, textareaRef, calculate]);

  useLayoutEffect(() => {
    if (showLineNumbers) {
      calculate(value);
    }
  }, [value, showLineNumbers, calculate]);

  return useMemo((): VirtualResult => {
    if (!showLineNumbers || !textareaRef.current || lineHeightRef.current === 0) {
      return { lineHeight: 0, paddingTop: 0, paddingBottom: 0, visibleItems: [] };
    }
    const lineHeight = lineHeightRef.current;
    const { clientHeight } = textareaRef.current;
    const totalVisualLines = visualLinePrefixSum.length > 0 ? visualLinePrefixSum[visualLinePrefixSum.length - 1] : 0;

    if (totalVisualLines === 0) {
      return { lineHeight, paddingTop: 0, paddingBottom: 0, visibleItems: [{ key: 0, number: 1 }] };
    }

    const buffer = 10;
    const startIndex = Math.max(0, Math.floor(scrollTop / lineHeight) - buffer);
    const endIndex = Math.min(totalVisualLines, Math.ceil((scrollTop + clientHeight) / lineHeight) + buffer);

    const visibleItems: Array<VirtualItem> = [];
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
    return { lineHeight, paddingTop, paddingBottom, visibleItems };
  }, [showLineNumbers, textareaRef, lineMetrics, scrollTop, visualLinePrefixSum]);
}
