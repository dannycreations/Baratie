import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { MODAL_SHOW_MS } from '../../app/constants';
import { errorHandler } from '../../app/container';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from './Button';
import { XIcon } from './Icon';

import type { JSX, MouseEvent, ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

interface ModalProps {
  readonly bodyClasses?: string;
  readonly children: ReactNode;
  readonly contentClasses?: string;
  readonly footerContent?: ReactNode;
  readonly headerActions?: ReactNode;
  readonly hideFooter?: boolean;
  readonly hideHeader?: boolean;
  readonly isOpen: boolean;
  readonly modalId?: string;
  readonly size?: ModalSize;
  readonly title: string;
  readonly titleId?: string;
  readonly onClose: () => void;
  readonly onExited?: () => void;
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
  ({
    isOpen,
    onClose,
    onExited,
    title,
    children,
    headerActions,
    footerContent,
    modalId = 'generic-modal',
    titleId = 'generic-modal-title',
    size = 'lg',
    hideHeader = false,
    hideFooter = false,
    contentClasses = '',
    bodyClasses = '',
  }): JSX.Element | null => {
    const [isRendered, setIsRendered] = useState(false);
    const theme = useThemeStore((state) => state.theme);
    const backdropRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);

    useFocusTrap({ elementRef: modalContentRef, isActive: isOpen });

    const handleBackdropClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === backdropRef.current) {
          onClose();
        }
      },
      [onClose],
    );

    const handleEscapeKey = useCallback(
      (event: KeyboardEvent) => {
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
        return () => clearTimeout(timerId);
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
    const modalClass =
      `flex w-full flex-col rounded-lg border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} ${modalSizeClass} ${contentClasses} ${contentAnimation}`.trim();

    errorHandler.assert(document.body, 'document.body is not available for Modal portal.', 'Modal Creation');

    return createPortal(
      <div
        ref={backdropRef}
        className={`fixed inset-0 z-[500] flex items-center justify-center bg-${theme.backdrop} p-4 backdrop-blur-sm ${backdropAnimation}`}
        onClick={handleBackdropClick}
      >
        <div
          ref={modalContentRef}
          id={modalId}
          role="dialog"
          aria-busy={!isOpen}
          aria-labelledby={!hideHeader && title ? titleId : undefined}
          aria-modal="true"
          className={modalClass}
          tabIndex={-1}
        >
          {!hideHeader && (
            <header className={`flex h-12 shrink-0 items-center justify-between border-b border-${theme.borderPrimary} p-3`}>
              <h2 id={titleId} className={`grow truncate pr-2 text-xl font-semibold text-${theme.contentPrimary}`}>
                {title}
              </h2>
              <div className="flex shrink-0 items-center">
                {headerActions && <div className="flex shrink-0 items-center space-x-2">{headerActions}</div>}
                <Button
                  aria-label={`Close ${title || 'modal'}`}
                  className={headerActions ? 'ml-2' : ''}
                  icon={<XIcon size={20} />}
                  size="sm"
                  variant="stealth"
                  onClick={onClose}
                />
              </div>
            </header>
          )}
          <main className={`grow overflow-y-auto p-3 ${bodyClasses}`}>{children}</main>
          {!hideFooter && footerContent && (
            <footer className={`flex shrink-0 justify-end space-x-3 border-t border-${theme.borderPrimary} p-3`}>{footerContent}</footer>
          )}
        </div>
      </div>,
      document.body,
    );
  },
);
