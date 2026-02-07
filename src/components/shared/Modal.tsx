import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ICON_SIZES, MODAL_SHOW_MS } from '../../app/constants';
import { errorHandler } from '../../app/container';
import { ModalSize } from '../../app/types';
import { Button } from './Button';
import { XIcon } from './Icon';

import type { JSX, KeyboardEvent, MouseEvent, ReactNode } from 'react';

interface ModalProps {
  readonly children?: ReactNode;
  readonly isOpen: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly contentClasses?: string;
  readonly headerActions?: ReactNode;
  readonly onExited?: () => void;
  readonly size?: ModalSize;
}

const MODAL_SIZE_MAP: Readonly<Record<ModalSize, string>> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
  xxl: 'modal-xxl',
  full: 'modal-full',
};

export const Modal = ({
  isOpen,
  onClose,
  onExited,
  title,
  children,
  headerActions,
  size = 'lg',
  contentClasses = 'max-h-[80vh]',
}: ModalProps): JSX.Element | null => {
  const [isRendered, setIsRendered] = useState(false);

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
      document.addEventListener('keydown', handleEscapeKey as unknown as EventListener);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey as unknown as EventListener);
      };
    }
  }, [isOpen, handleEscapeKey]);

  if (!isRendered) {
    return null;
  }

  const backdropClass = clsx(
    'fixed inset-0 z-[500] flex items-center justify-center p-3 backdrop-blur-sm bg-backdrop',
    isOpen ? 'modal-backdrop-enter-active' : 'modal-backdrop-exit-active',
  );
  const modalClass = clsx(
    'panel-container border border-border-primary',
    MODAL_SIZE_MAP[size] || MODAL_SIZE_MAP.lg,
    isOpen ? 'modal-content-enter-active' : 'modal-content-exit-active',
    contentClasses,
  );

  errorHandler.assert(document.body, 'document.body is not available for Modal portal.', 'Modal Creation');

  return createPortal(
    <div ref={backdropRef} className={backdropClass} onClick={handleBackdropClick}>
      <div ref={modalContentRef} className={modalClass}>
        <header className="panel-header">
          <h2 className="modal-header-title">{title}</h2>
          <div className="modal-header-actions-wrapper">
            {headerActions && <div className="panel-header-actions">{headerActions}</div>}
            <Button icon={<XIcon size={ICON_SIZES.MD} />} size="sm" variant="stealth" onClick={onClose} />
          </div>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
