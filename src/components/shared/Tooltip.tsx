import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useThemeStore } from '../../stores/useThemeStore';
import { useTooltipStore } from '../../stores/useTooltipStore';

import type { JSX, ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly content: ReactNode;
  readonly delay?: number;
  readonly disabled?: boolean;
  readonly position?: TooltipPosition;
  readonly tooltipClassName?: string;
}

const ARROW_SIZE_PX = 5;
const TOOLTIP_GAP_PX = 8;

export const Tooltip = memo<TooltipProps>(
  ({ content, children, position = 'top', delay = 200, className = '', tooltipClassName = '', disabled = false }): JSX.Element => {
    const { activeId, setActiveId } = useTooltipStore();
    const theme = useThemeStore((state) => state.theme);

    const [tooltipCoords, setTooltipCoords] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });
    const [arrowOffset, setArrowOffset] = useState<{ left?: number; top?: number }>({});
    const [isPositioned, setIsPositioned] = useState(false);

    const timeoutRef = useRef<number | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const tooltipId = useId();

    const isVisible = activeId === tooltipId;

    const clearTimer = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    const handleMouseEnter = useCallback(() => {
      if (disabled || !content) {
        return;
      }
      clearTimer();

      timeoutRef.current = window.setTimeout(() => {
        setActiveId(tooltipId);
      }, delay);
    }, [disabled, content, clearTimer, delay, tooltipId, setActiveId]);

    const handleMouseLeave = useCallback(() => {
      clearTimer();
      if (activeId === tooltipId) {
        setActiveId(null);
      }
    }, [clearTimer, activeId, tooltipId, setActiveId]);

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
        setIsPositioned(false);
      }
    }, [isVisible]);

    useLayoutEffect(() => {
      const calculatePosition = () => {
        if (!isVisible || !triggerRef.current || !tooltipRef.current) {
          return;
        }
        const triggerRect = triggerRef.current.getBoundingClientRect();
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

        let arrowLeft: number | undefined = undefined;
        let arrowTop: number | undefined = undefined;

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

        setTooltipCoords({ top: finalTop, left: finalLeft });
        setArrowOffset({
          left: arrowLeft !== undefined ? Math.round(arrowLeft) : undefined,
          top: arrowTop !== undefined ? Math.round(arrowTop) : undefined,
        });
        setIsPositioned(true);
      };

      if (isVisible) {
        const animationFrameId = requestAnimationFrame(calculatePosition);
        window.addEventListener('resize', calculatePosition);
        window.addEventListener('scroll', calculatePosition, true);

        return () => {
          cancelAnimationFrame(animationFrameId);
          window.removeEventListener('resize', calculatePosition);
          window.removeEventListener('scroll', calculatePosition, true);
        };
      } else {
        setTooltipCoords({ top: -9999, left: -9999 });
      }
    }, [isVisible, position, content]);

    const tooltipArrows: Readonly<Record<TooltipPosition, string>> = useMemo(
      () => ({
        bottom: `absolute bottom-full h-0 w-0 border-x-transparent border-t-transparent border-b-${theme.backdrop}`,
        left: `absolute left-full h-0 w-0 border-y-transparent border-r-transparent border-l-${theme.backdrop}`,
        right: `absolute right-full h-0 w-0 border-y-transparent border-l-transparent border-r-${theme.backdrop}`,
        top: `absolute top-full h-0 w-0 border-x-transparent border-b-transparent border-t-${theme.backdrop}`,
      }),
      [theme.backdrop],
    );
    const arrowClasses = tooltipArrows[position] || tooltipArrows.top;
    const visibilityClass = isVisible && isPositioned ? 'opacity-100' : 'pointer-events-none opacity-0';
    const tooltipClasses =
      `z-[1000] max-w-xs rounded-md bg-${theme.backdrop} px-3 py-1.5 text-sm text-${theme.accentFg} font-medium shadow-lg transition-opacity duration-150 whitespace-pre-line ${visibilityClass} ${tooltipClassName}`.trim();
    const triggerClasses = `relative inline-flex ${className}`.trim();

    const triggerElement = (
      <div
        ref={triggerRef}
        aria-describedby={isVisible && !disabled && content ? tooltipId : undefined}
        className={triggerClasses}
        onDragStart={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
            role="tooltip"
            className={tooltipClasses}
            style={{
              left: `${tooltipCoords.left}px`,
              position: 'fixed',
              top: `${tooltipCoords.top}px`,
            }}
          >
            {content}
            <div
              className={arrowClasses}
              style={{
                borderWidth: `${ARROW_SIZE_PX}px`,
                left: arrowOffset.left !== undefined ? `${arrowOffset.left}px` : undefined,
                top: arrowOffset.top !== undefined ? `${arrowOffset.top}px` : undefined,
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
