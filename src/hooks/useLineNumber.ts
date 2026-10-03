import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface LineNumberProps {
  readonly value: string;
  readonly scrollTop: number;
  readonly showLineNumbers: boolean;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
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

interface TextareaMetrics {
  readonly lineHeight: number;
  readonly charWidth: number;
  readonly contentWidth: number;
}

const OVERSCAN_LINES = 10;

const EMPTY_RESULT: VirtualResult = {
  lineHeight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  visibleItems: [],
};

const findStartLogicalLineIndex = (prefixSum: ReadonlyArray<number>, targetVisualLine: number): number => {
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
};

export const selectVisibleLineItems = (prefixSum: ReadonlyArray<number>, startIndex: number, endIndex: number): Array<VirtualItem> => {
  const visibleItems: Array<VirtualItem> = [];
  const startLogicalIndex = findStartLogicalLineIndex(prefixSum, startIndex + 1);
  let currentVisualLine = startLogicalIndex > 0 ? prefixSum[startLogicalIndex - 1] : 0;

  for (let logicalIndex = startLogicalIndex; logicalIndex < prefixSum.length; logicalIndex++) {
    const lineEnd = prefixSum[logicalIndex];

    for (let visualIndex = currentVisualLine; visualIndex < lineEnd; visualIndex++) {
      if (visualIndex >= startIndex && visualIndex < endIndex) {
        visibleItems.push({
          key: visualIndex,
          number: visualIndex === currentVisualLine ? logicalIndex + 1 : null,
        });
      }
    }

    if (lineEnd >= endIndex) {
      break;
    }

    currentVisualLine = lineEnd;
  }

  return visibleItems;
};

export const useLineNumber = ({ textareaRef, value, showLineNumbers, scrollTop }: LineNumberProps): VirtualResult => {
  const [visualLinePrefixSum, setVisualLinePrefixSum] = useState<ReadonlyArray<number>>([]);

  const metricsRef = useRef<TextareaMetrics | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

  const getCanvasContext = useCallback((): CanvasRenderingContext2D | null => {
    if (!canvasContextRef.current) {
      const canvas = document.createElement('canvas');
      canvasContextRef.current = canvas.getContext('2d');
    }
    return canvasContextRef.current;
  }, []);

  const calculateLineCounts = useCallback(
    (currentValue: string) => {
      if (!showLineNumbers) {
        setVisualLinePrefixSum([]);
        return;
      }

      if (!metricsRef.current) {
        pendingValueRef.current = currentValue;
        return;
      }

      const { contentWidth, charWidth } = metricsRef.current;
      const maxLineChars = charWidth > 0 ? Math.floor(contentWidth / charWidth) : 0;

      const newPrefixSum: Array<number> = [];
      let visualLineCount = 0;

      const lines = currentValue.split('\n');
      const len = lines.length;
      for (let i = 0; i < len; i++) {
        const lineLength = lines[i].length;
        visualLineCount += maxLineChars > 0 ? Math.max(1, Math.ceil(lineLength / maxLineChars)) : 1;
        newPrefixSum.push(visualLineCount);
      }

      setVisualLinePrefixSum(newPrefixSum);
    },
    [showLineNumbers],
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!showLineNumbers || !textarea) {
      return;
    }

    const measureAndCalculate = (): void => {
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
      const lh = parseFloat(styles.lineHeight);
      metricsRef.current = {
        lineHeight: isNaN(lh) ? 24 : lh,
        contentWidth: contentWidth,
        charWidth: charWidth,
      };

      if (pendingValueRef.current !== null) {
        calculateLineCounts(pendingValueRef.current);
        pendingValueRef.current = null;
      } else {
        calculateLineCounts(textarea.value);
      }
    };

    document.fonts.ready.then(measureAndCalculate).catch(measureAndCalculate);
    const resizeObserver = new ResizeObserver(measureAndCalculate);
    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showLineNumbers, textareaRef, getCanvasContext, calculateLineCounts]);

  useLayoutEffect(() => {
    if (showLineNumbers) {
      calculateLineCounts(value);
    }
  }, [value, showLineNumbers, calculateLineCounts]);

  return useMemo((): VirtualResult => {
    const lineHeight = metricsRef.current?.lineHeight ?? 0;
    if (!showLineNumbers || !textareaRef.current || lineHeight === 0) {
      return EMPTY_RESULT;
    }

    const totalVisualLines = visualLinePrefixSum.length > 0 ? visualLinePrefixSum[visualLinePrefixSum.length - 1] : 0;

    if (totalVisualLines === 0) {
      return { lineHeight, paddingTop: 0, paddingBottom: 0, visibleItems: [{ key: 0, number: 1 }] };
    }

    const { clientHeight } = textareaRef.current;
    const startIndex = Math.max(0, Math.floor(scrollTop / lineHeight) - OVERSCAN_LINES);
    const endIndex = Math.min(totalVisualLines, Math.ceil((scrollTop + clientHeight) / lineHeight) + OVERSCAN_LINES);

    return {
      lineHeight,
      paddingTop: startIndex * lineHeight,
      paddingBottom: Math.max(0, (totalVisualLines - endIndex) * lineHeight),
      visibleItems: startIndex < endIndex ? selectVisibleLineItems(visualLinePrefixSum, startIndex, endIndex) : [],
    };
  }, [showLineNumbers, textareaRef, scrollTop, visualLinePrefixSum]);
};
