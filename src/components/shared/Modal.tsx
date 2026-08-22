import { cn } from 'cnfast';
import { X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ICON_SIZES, MODAL_SHOW_MS } from '../../app/constants';
import { Button } from './Button';

import type { JSX, MouseEvent, ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

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
  const [isClosing, setIsClosing] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

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

  const prevIsOpen = useRef(isOpen);
  useLayoutEffect(() => {
    setIsClosing(prevIsOpen.current && !isOpen);
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      const timerId = window.setTimeout(() => {
        setIsClosing(false);
        onExitedRef.current?.();
      }, MODAL_SHOW_MS);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, handleEscapeKey]);

  if (!isOpen && !isClosing) {
    return null;
  }

  const backdropClass = cn('modal-backdrop', isOpen ? 'modal-backdrop-enter-active' : 'modal-backdrop-exit-active');
  const modalClass = cn(
    'panel-container border border-border-primary',
    `modal-${size}`,
    isOpen ? 'modal-content-enter-active' : 'modal-content-exit-active',
    contentClasses,
  );

  return createPortal(
    <div ref={backdropRef} className={backdropClass} onClick={handleBackdropClick}>
      <div className={modalClass}>
        <header className="panel-header">
          <h2 className="modal-header-title">{title}</h2>
          <div className="modal-header-actions-wrapper">
            {headerActions && <div className="panel-header-actions">{headerActions}</div>}
            <Button icon={<X size={ICON_SIZES.MD} />} size="sm" variant="stealth" onClick={onClose} />
          </div>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
