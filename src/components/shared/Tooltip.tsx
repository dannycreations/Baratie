import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useThemeStore } from '../../stores/useThemeStore';
import { useTooltipStore } from '../../stores/useTooltipStore';

import type { JSX, ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  readonly children: ReactNode;
  readonly content: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly disabled?: boolean;
  readonly position?: TooltipPosition;
  readonly tooltipClasses?: string;
}

interface TooltipPositionStyle {
  readonly left: number;
  readonly top: number;
  readonly arrowLeft?: number;
  readonly arrowTop?: number;
  readonly isPositioned: boolean;
}

const ARROW_SIZE_PX = 5;
const TOOLTIP_GAP_PX = 8;
const INITIAL_TOOLTIP_STYLE: TooltipPositionStyle = {
  top: -9999,
  left: -9999,
  isPositioned: false,
};

export const Tooltip = memo<TooltipProps>(
  ({ content, children, position = 'top', delay = 200, className = '', tooltipClasses = '', disabled = false }): JSX.Element => {
    const { activeId, setActiveId } = useTooltipStore();
    const theme = useThemeStore((state) => state.theme);

    const [style, setStyle] = useState<TooltipPositionStyle>(INITIAL_TOOLTIP_STYLE);

    const timeoutRef = useRef<number | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const tooltipId = useId();

    const isVisible = activeId === tooltipId;

    const clearTimer = useCallback((): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    const handleMouseEnter = useCallback((): void => {
      if (disabled || !content) {
        return;
      }
      clearTimer();
      timeoutRef.current = window.setTimeout(() => {
        setActiveId(tooltipId);
      }, delay);
    }, [disabled, content, clearTimer, delay, tooltipId, setActiveId]);

    const handleMouseLeave = useCallback((): void => {
      clearTimer();
      if (activeId === tooltipId) {
        setActiveId(null);
      }
    }, [clearTimer, activeId, tooltipId, setActiveId]);

    const tooltipArrows: Readonly<Record<TooltipPosition, string>> = useMemo(
      () => ({
        top: `absolute top-full h-0 w-0 border-x-transparent border-b-transparent border-t-${theme.backdrop}`,
        bottom: `absolute bottom-full h-0 w-0 border-x-transparent border-t-transparent border-b-${theme.backdrop}`,
        left: `absolute left-full h-0 w-0 border-y-transparent border-r-transparent border-l-${theme.backdrop}`,
        right: `absolute right-full h-0 w-0 border-y-transparent border-l-transparent border-r-${theme.backdrop}`,
      }),
      [theme.backdrop],
    );

    useEffect(() => {
      return clearTimer;
    }, [clearTimer]);

    useEffect(() => {
      return () => {
        if (useTooltipStore.getState().activeId === tooltipId) {
          setActiveId(null);
        }
      };
    }, [tooltipId, setActiveId]);

    useEffect(() => {
      if (!isVisible) {
        setStyle(INITIAL_TOOLTIP_STYLE);
      }
    }, [isVisible]);

    useLayoutEffect(() => {
      const calculatePosition = (): void => {
        if (!isVisible || !triggerRef.current || !tooltipRef.current) {
          return;
        }

        const triggerElement = triggerRef.current.firstElementChild || triggerRef.current;
        const triggerRect = triggerElement.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newTop = 0;
        let newLeft = 0;
        const triggerCenterX = triggerRect.left + triggerRect.width / 2;
        const triggerCenterY = triggerRect.top + triggerRect.height / 2;

        switch (position) {
          case 'top':
            newTop = triggerRect.top - tooltipRect.height - TOOLTIP_GAP_PX;
            newLeft = triggerCenterX - tooltipRect.width / 2;
            break;
          case 'bottom':
            newTop = triggerRect.bottom + TOOLTIP_GAP_PX;
            newLeft = triggerCenterX - tooltipRect.width / 2;
            break;
          case 'left':
            newTop = triggerCenterY - tooltipRect.height / 2;
            newLeft = triggerRect.left - tooltipRect.width - TOOLTIP_GAP_PX;
            break;
          case 'right':
            newTop = triggerCenterY - tooltipRect.height / 2;
            newLeft = triggerRect.right + TOOLTIP_GAP_PX;
            break;
        }

        newLeft = Math.max(TOOLTIP_GAP_PX, Math.min(newLeft, viewportWidth - tooltipRect.width - TOOLTIP_GAP_PX));
        newTop = Math.max(TOOLTIP_GAP_PX, Math.min(newTop, viewportHeight - tooltipRect.height - TOOLTIP_GAP_PX));
        const finalLeft = Math.round(newLeft);
        const finalTop = Math.round(newTop);

        let arrowLeft: number | undefined;
        let arrowTop: number | undefined;

        switch (position) {
          case 'top':
          case 'bottom':
            arrowLeft = triggerCenterX - finalLeft - ARROW_SIZE_PX;
            arrowLeft = Math.max(ARROW_SIZE_PX, Math.min(arrowLeft, tooltipRect.width - ARROW_SIZE_PX * 3));
            break;
          case 'left':
          case 'right':
            arrowTop = triggerCenterY - finalTop - ARROW_SIZE_PX;
            arrowTop = Math.max(ARROW_SIZE_PX, Math.min(arrowTop, tooltipRect.height - ARROW_SIZE_PX * 3));
            break;
        }

        setStyle({
          top: finalTop,
          left: finalLeft,
          arrowLeft: arrowLeft !== undefined ? Math.round(arrowLeft) : undefined,
          arrowTop: arrowTop !== undefined ? Math.round(arrowTop) : undefined,
          isPositioned: true,
        });
      };

      if (isVisible) {
        calculatePosition();
        window.addEventListener('resize', calculatePosition);
        window.addEventListener('scroll', calculatePosition, true);
        return () => {
          window.removeEventListener('resize', calculatePosition);
          window.removeEventListener('scroll', calculatePosition, true);
        };
      }
    }, [isVisible, position, content]);

    const arrowClass = tooltipArrows[position] || tooltipArrows.top;
    const visibilityClass = isVisible && style.isPositioned ? 'opacity-100' : 'pointer-events-none opacity-0';
    const tooltipClass = `
      z-[1000] max-w-xs rounded-md bg-${theme.backdrop} p-2
      text-sm font-medium text-${theme.accentFg} whitespace-pre-line
      shadow-lg transition-opacity duration-150 ${visibilityClass} ${tooltipClasses}
    `.trim();
    const triggerClass = `relative inline-flex ${className}`.trim();

    const triggerElement = (
      <div
        ref={triggerRef}
        className={triggerClass}
        aria-describedby={isVisible && !disabled && content ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleMouseLeave}
      >
        {children}
      </div>
    );

    if (disabled || !content) {
      return triggerElement;
    }

    const tooltipElement = isVisible
      ? createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            className={tooltipClass}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${style.top}px`,
              left: `${style.left}px`,
            }}
          >
            {content}
            <div
              className={arrowClass}
              style={{
                borderWidth: `${ARROW_SIZE_PX}px`,
                top: style.arrowTop !== undefined ? `${style.arrowTop}px` : undefined,
                left: style.arrowLeft !== undefined ? `${style.arrowLeft}px` : undefined,
              }}
            />
          </div>,
          document.body,
        )
      : null;

    return (
      <>
        {triggerElement}
        {tooltipElement}
      </>
    );
  },
);
