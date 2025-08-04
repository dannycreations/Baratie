import { memo, useCallback, useRef, useState } from 'react';

import { useDropZone } from '../../../hooks/useDropZone';
import { useLineNumber } from '../../../hooks/useLineNumber';
import { useThemeStore } from '../../../stores/useThemeStore';
import { DropZoneLayout } from '../layout/DropZoneLayout';

import type { ChangeEvent, JSX, UIEvent } from 'react';

interface TextareaInputProps {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly onFileDrop?: (file: File) => void;
  readonly showLineNumbers?: boolean;
  readonly textareaClasses?: string;
  readonly wrapperClasses?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  readonly rows?: number;
  readonly id?: string;
}

export const TextareaInput = memo<TextareaInputProps>(
  ({
    value,
    onChange,
    onFileDrop,
    wrapperClasses = '',
    textareaClasses = '',
    showLineNumbers = false,
    disabled,
    placeholder = '',
    readOnly,
    rows,
    id,
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [scrollTop, setScrollTop] = useState(0);

    const virtualizedLines = useLineNumber({ value, showLineNumbers, textareaRef, scrollTop });

    const handleDrop = useCallback(
      (file: File): void => {
        if (!disabled && onFileDrop) {
          onFileDrop(file);
        }
      },
      [disabled, onFileDrop],
    );

    const { isDragOver, dropZoneProps } = useDropZone<File, HTMLDivElement>({
      disabled: disabled || !onFileDrop,
      onValidate: (dt) => [...dt.items].some((item) => item.kind === 'file'),
      onExtract: (dt) => dt.files?.[0],
      onDrop: handleDrop,
    });

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>): void => {
        onChange?.(event.target.value);
      },
      [onChange],
    );

    const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>): void => {
      const newScrollTop = event.currentTarget.scrollTop;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = newScrollTop;
      }
      setScrollTop(newScrollTop);
    }, []);

    const containerClass =
      `relative flex overflow-hidden rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} focus-within:ring-2 focus-within:ring-${theme.ring} ${disabled ? 'opacity-50' : ''} ${wrapperClasses}`.trim();
    const gutterClass = `shrink-0 p-2 overflow-hidden select-none text-right text-${theme.contentTertiary} bg-${theme.surfaceSecondary} border-r border-${theme.borderPrimary}`;
    const commonStyles = `h-full w-full resize-none p-2 font-mono text-${theme.contentPrimary} outline-none allow-text-selection placeholder:text-${theme.contentTertiary}`;
    const textareaClass = `${commonStyles} bg-transparent ${textareaClasses}`;

    return (
      <div className={containerClass} {...dropZoneProps}>
        {showLineNumbers && (
          <div ref={lineNumbersRef} className={gutterClass}>
            <div style={{ paddingTop: `${virtualizedLines.paddingTop}px`, paddingBottom: `${virtualizedLines.paddingBottom}px` }}>
              {virtualizedLines.visibleItems.map(({ key, number }) => (
                <div key={key} style={{ height: virtualizedLines.lineHeight }}>
                  {number ?? ''}
                </div>
              ))}
            </div>
          </div>
        )}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          className={textareaClass}
          disabled={disabled}
          placeholder={placeholder}
          readOnly={readOnly}
          rows={rows}
          onChange={handleChange}
          onScroll={handleScroll}
        />
        {isDragOver && <DropZoneLayout mode="overlay" text="Drop file" variant="add" />}
      </div>
    );
  },
);
