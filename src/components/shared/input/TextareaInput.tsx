import { memo, useCallback, useRef, useState } from 'react';

import { errorHandler } from '../../../app/container';
import { useDropZone } from '../../../hooks/useDropZone';
import { useLineNumber } from '../../../hooks/useLineNumber';
import { useThemeStore } from '../../../stores/useThemeStore';
import { readAsText } from '../../../utilities/fileUtil';
import { DropZoneLayout } from '../layout/DropZoneLayout';

import type { ChangeEvent, JSX, TextareaHTMLAttributes, UIEvent } from 'react';

interface TextareaInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'spellCheck'> {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly showLineNumbers?: boolean;
  readonly textareaClasses?: string;
  readonly wrapperClasses?: string;
}

export const TextareaInput = memo<TextareaInputProps>(
  ({ value, onChange, wrapperClasses = '', textareaClasses = '', showLineNumbers = false, ...rest }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const { disabled, placeholder = '' } = rest;

    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [scrollTop, setScrollTop] = useState(0);

    const virtualizedLines = useLineNumber({ value, showLineNumbers, textareaRef, scrollTop });

    const handleFileDrop = useCallback(
      async (file: File): Promise<void> => {
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

    const { isDragOver, dropZoneProps } = useDropZone<File, HTMLDivElement>({
      disabled,
      onValidate: (dt) => Array.from(dt.items).some((item) => item.kind === 'file'),
      onExtract: (dt) => dt.files?.[0],
      onDrop: handleFileDrop,
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

    const containerClass = `
      relative flex overflow-hidden rounded-md border border-${theme.borderPrimary}
      bg-${theme.surfaceSecondary} focus-within:ring-2 focus-within:ring-${theme.ring}
      ${disabled ? 'opacity-50' : ''} ${wrapperClasses}
    `.trim();

    const gutterClass = `
      shrink-0 select-none overflow-y-hidden border-r
      border-${theme.borderPrimary} bg-${theme.surfaceSecondary} p-2
      text-right text-${theme.contentTertiary}
    `;

    const commonStyles = `
      h-full w-full resize-none p-2 text-${theme.contentPrimary} outline-none
      allow-text-selection placeholder:text-${theme.contentTertiary} font-mono
    `;
    const textareaClass = `${commonStyles} bg-transparent ${textareaClasses}`;

    return (
      <div className={containerClass} {...dropZoneProps}>
        {showLineNumbers && (
          <div ref={lineNumbersRef} className={gutterClass} aria-hidden="true">
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
          className={textareaClass}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          {...rest}
          onChange={handleChange}
          onScroll={handleScroll}
        />
        {isDragOver && <DropZoneLayout mode="overlay" text="Drop text file" variant="add" />}
      </div>
    );
  },
);
