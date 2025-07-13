import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ANIMATION_MODAL_MS } from '../../app/constants';
import { errorHandler } from '../../app/container';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from './Button';
import { XIcon } from './Icon';
import { HeaderLayout } from './layout/HeaderLayout';

import type { JSX, MouseEvent, ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

interface ModalProps {
  readonly bodyClassName?: string;
  readonly children: ReactNode;
  readonly contentClassName?: string;
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

export const Modal = memo(function Modal({
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
  contentClassName = '',
  bodyClassName = '',
}: ModalProps): JSX.Element | null {
  const [isRendered, setIsRendered] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

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
    let timer: number;
    if (isOpen) {
      setIsRendered(true);
    } else if (isRendered) {
      timer = window.setTimeout(() => {
        setIsRendered(false);
        onExited?.();
      }, ANIMATION_MODAL_MS);
    }
    return () => clearTimeout(timer);
  }, [isOpen, isRendered, onExited]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, handleEscapeKey]);

  useFocusTrap({ elementRef: modalContentRef, isActive: isOpen });

  if (!isRendered) {
    return null;
  }

  const modalSizeClass = MODAL_SIZE_MAP[size] || MODAL_SIZE_MAP.lg;
  const modalClasses = [
    'flex',
    'w-full',
    'flex-col',
    'rounded-lg',
    'border',
    `border-${theme.borderPrimary}`,
    `bg-${theme.surfaceSecondary}`,
    modalSizeClass,
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const backdropAnimation = isOpen ? 'modal-backdrop-enter-active' : 'modal-backdrop-exit-active';
  const contentAnimation = isOpen ? 'modal-content-enter-active' : 'modal-content-exit-active';

  errorHandler.assert(document.body, 'document.body is not available for Modal portal.', 'Modal Creation');

  const leftHeader = (
    <h2 id={titleId} className={`grow truncate pr-2 text-xl font-semibold text-${theme.contentPrimary}`}>
      {title}
    </h2>
  );
  const rightHeader = (
    <>
      {headerActions && <div className="flex shrink-0 items-center space-x-2">{headerActions}</div>}
      <Button
        aria-label={`Close ${title || 'modal'}`}
        className={headerActions ? 'ml-2' : ''}
        icon={<XIcon size={20} />}
        onClick={onClose}
        size="sm"
        variant="stealth"
      />
    </>
  );

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
        className={[modalClasses, contentAnimation].join(' ')}
        tabIndex={-1}
      >
        {!hideHeader && (
          <header className={`flex h-12 shrink-0 items-center justify-between border-b border-${theme.borderPrimary} p-3`}>
            <HeaderLayout leftContent={leftHeader} rightContent={rightHeader} />
          </header>
        )}
        <main className={`grow overflow-y-auto p-3 ${bodyClassName}`}>{children}</main>
        {!hideFooter && footerContent && (
          <footer className={`flex shrink-0 justify-end space-x-3 border-t border-${theme.borderPrimary} p-3`}>{footerContent}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
});
