import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ICON_SIZES, MODAL_SHOW_MS } from '../../app/constants';
import { errorHandler } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from './Button';
import { XIcon } from './Icon';

import type { JSX, MouseEvent, ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

interface ModalProps {
  readonly children: ReactNode;
  readonly isOpen: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly contentClasses?: string;
  readonly headerActions?: ReactNode;
  readonly onExited?: () => void;
  readonly size?: ModalSize;
}

const MODAL_SIZE_MAP: Readonly<Record<ModalSize, string>> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  xxl: 'max-w-4xl',
  full: 'max-w-full sm:h-[90vh] sm:max-h-[90vh]',
};

export const Modal = memo<ModalProps>(
  ({ isOpen, onClose, onExited, title, children, headerActions, size = 'lg', contentClasses = 'max-h-[80vh]' }): JSX.Element | null => {
    const [isRendered, setIsRendered] = useState(false);

    const theme = useThemeStore((state) => state.theme);

    const backdropRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = useCallback(
      (event: MouseEvent<HTMLDivElement>): void => {
        if (event.target === backdropRef.current) {
          onClose();
        }
      },
      [onClose],
    );

    const handleEscapeKey = useCallback(
      (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          onClose();
        }
      },
      [onClose],
    );

    useEffect(() => {
      if (isOpen) {
        setIsRendered(true);
        return;
      }
      if (isRendered) {
        const timerId = window.setTimeout(() => {
          setIsRendered(false);
          onExited?.();
        }, MODAL_SHOW_MS);
        return () => {
          clearTimeout(timerId);
        };
      }
    }, [isOpen, isRendered, onExited]);

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
          document.removeEventListener('keydown', handleEscapeKey);
        };
      }
    }, [isOpen, handleEscapeKey]);

    if (!isRendered) {
      return null;
    }

    const modalSizeClass = MODAL_SIZE_MAP[size] || MODAL_SIZE_MAP.lg;
    const backdropAnimation = isOpen ? 'modal-backdrop-enter-active' : 'modal-backdrop-exit-active';
    const contentAnimation = isOpen ? 'modal-content-enter-active' : 'modal-content-exit-active';
    const backdropClass = `fixed inset-0 z-[500] flex items-center justify-center p-3 bg-${theme.backdrop} backdrop-blur-sm ${backdropAnimation}`;
    const modalClass =
      `flex w-full flex-col rounded-lg border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} ${modalSizeClass} ${contentClasses} ${contentAnimation}`.trim();

    errorHandler.assert(document.body, 'document.body is not available for Modal portal.', 'Modal Creation');

    return createPortal(
      <div ref={backdropRef} className={backdropClass} onClick={handleBackdropClick}>
        <div ref={modalContentRef} className={modalClass}>
          <header className={`flex h-12 shrink-0 items-center justify-between border-b border-${theme.borderPrimary} px-2`}>
            <h2 className={`grow truncate pr-2 font-semibold text-xl text-${theme.contentPrimary}`}>{title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              {headerActions && <div className="flex shrink-0 items-center gap-1">{headerActions}</div>}
              <Button icon={<XIcon size={ICON_SIZES.MD} />} size="sm" variant="stealth" onClick={onClose} />
            </div>
          </header>
          <div className="flex min-h-0 flex-col p-3">{children}</div>
        </div>
      </div>,
      document.body,
    );
  },
);
