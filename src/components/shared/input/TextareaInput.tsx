import { memo, useCallback, useRef, useState } from 'react';

import { errorHandler } from '../../../app/container';
import { useDragDrop } from '../../../hooks/useDragDrop';
import { useLineNumber } from '../../../hooks/useLineNumber';
import { useThemeStore } from '../../../stores/useThemeStore';
import { readAsText } from '../../../utilities/fileUtil';
import { DropzoneLayout } from '../layout/DropzoneLayout';

import type { ChangeEvent, JSX, TextareaHTMLAttributes, UIEvent } from 'react';

interface TextareaInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'spellCheck'> {
  readonly value: string;
  readonly showLineNumbers?: boolean;
  readonly textareaClasses?: string;
  readonly wrapperClasses?: string;
  readonly onChange?: (value: string) => void;
}

export const TextareaInput = memo<TextareaInputProps>(
  ({ value, onChange, wrapperClasses = '', textareaClasses = '', showLineNumbers = false, ...rest }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const { disabled, placeholder = '' } = rest;

    const virtualizedLines = useLineNumber({ value, showLineNumbers, textareaRef, scrollTop });

    const handleFileDrop = useCallback(
      async (file: File) => {
        if (disabled || !onChange) {
          return;
        }
        const { result: text, error } = await errorHandler.attemptAsync(() => readAsText(file));
        if (!error && typeof text === 'string') {
          onChange(text);
        }
      },
      [disabled, onChange],
    );

    const { isDragOver, ...dropZoneProps } = useDragDrop({ onDragDrop: handleFileDrop, disabled });

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(event.target.value);
      },
      [onChange],
    );

    const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
      const newScrollTop = event.currentTarget.scrollTop;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = newScrollTop;
      }
      setScrollTop(newScrollTop);
    }, []);

    const containerClass = `
      relative flex overflow-hidden rounded-md border border-${theme.borderPrimary}
      bg-${theme.surfaceSecondary} focus-within:ring-2 focus-within:ring-${theme.ring}
      ${disabled ? 'opacity-50' : ''} ${wrapperClasses}
    `.trim();

    const gutterClass = `
      shrink-0 select-none overflow-y-hidden border-r
      border-${theme.borderPrimary} bg-${theme.surfaceSecondary} py-2.5 pl-2.5 pr-2
      text-right text-${theme.contentTertiary}
    `;

    const commonStyles = `
      h-full w-full resize-none p-2.5 text-${theme.contentPrimary} outline-none
      allow-text-selection placeholder:text-${theme.contentTertiary} font-mono
    `;
    const textareaClass = `${commonStyles} bg-transparent ${textareaClasses}`;

    return (
      <div className={containerClass} {...dropZoneProps}>
        {showLineNumbers && (
          <div ref={lineNumbersRef} aria-hidden="true" className={gutterClass}>
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
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          {...rest}
          className={textareaClass}
          onChange={handleChange}
          onScroll={handleScroll}
        />
        {isDragOver && <DropzoneLayout mode="overlay" text="Drop text file" variant="add" />}
      </div>
    );
  },
);
