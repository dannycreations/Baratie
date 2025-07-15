import { memo, useCallback, useMemo, useRef } from 'react';

import { errorHandler } from '../../../app/container';
import { useDragDrop } from '../../../hooks/useDragDrop';
import { useLineNumber } from '../../../hooks/useLineNumber';
import { useThemeStore } from '../../../stores/useThemeStore';
import { readAsText } from '../../../utilities/fileUtil';
import { DropzoneLayout } from '../layout/DropzoneLayout';

import type { ChangeEvent, JSX, TextareaHTMLAttributes, UIEvent } from 'react';

interface TextareaInputProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'readOnly' | 'placeholder' | 'disabled' | 'spellCheck'> {
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  readonly showLineNumbers?: boolean;
  readonly spellCheck?: 'true' | 'false';
  readonly textareaClass?: string;
  readonly value: string;
  readonly wrapperClass?: string;
  readonly onChange?: (value: string) => void;
}

export const TextareaInput = memo<TextareaInputProps>(
  ({
    value,
    onChange,
    readOnly = false,
    wrapperClass = '',
    textareaClass = '',
    placeholder = '',
    ariaLabel,
    spellCheck = 'false',
    disabled = false,
    showLineNumbers = false,
    ...rest
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const logicalLines = useMemo(() => value.split('\n'), [value]);
    const wrappedLineNumbers = useLineNumber({ logicalLines, showLineNumbers, textAreaRef: textareaRef });

    const handleFileDrop = useCallback(
      async (file: File) => {
        if (readOnly || disabled || !onChange) return;
        const { result: text, error } = await errorHandler.attemptAsync(() => readAsText(file));
        if (!error && typeof text === 'string') {
          onChange(text);
        }
      },
      [readOnly, disabled, onChange],
    );

    const { isDragOver, ...dropZoneProps } = useDragDrop({ onDragDrop: handleFileDrop, disabled: readOnly || disabled });

    const handleTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value), [onChange]);

    const commonTextStyles = `h-full w-full resize-none p-2.5 text-${theme.contentPrimary} outline-none allow-text-selection placeholder:text-${theme.contentTertiary}`;

    const renderStandard = (): JSX.Element => {
      const baseTextClasses = `${commonTextStyles} rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} focus:ring-2 focus:ring-${theme.ring} disabled:opacity-50`;
      return (
        <div className={`relative ${wrapperClass}`} {...dropZoneProps}>
          <textarea
            ref={textareaRef}
            aria-label={ariaLabel}
            className={`${baseTextClasses} ${textareaClass}`}
            disabled={disabled}
            placeholder={placeholder}
            readOnly={readOnly}
            spellCheck={spellCheck}
            value={value}
            onChange={handleTextChange}
            {...rest}
          />
          {isDragOver && <DropzoneLayout mode="overlay" text="Drop text file" variant="add" />}
        </div>
      );
    };

    const renderLined = (): JSX.Element => {
      const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
      }, []);

      const lineHeight = rest.style?.['lineHeight'] ?? '1.6';
      const boxContainerClasses =
        `relative flex overflow-hidden rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} focus-within:ring-2 focus-within:ring-${theme.ring} ${
          disabled ? 'opacity-50' : ''
        } ${wrapperClass} ${textareaClass}`.trim();
      const gutterClasses = `shrink-0 select-none overflow-y-hidden border-r border-${theme.borderPrimary} bg-${theme.surfaceSecondary} py-2.5 pl-2.5 pr-2 text-right text-${theme.contentTertiary}`;
      const linedTextClasses = `${commonTextStyles} bg-transparent`;

      return (
        <div className={boxContainerClasses} {...dropZoneProps}>
          <div ref={lineNumbersRef} aria-hidden="true" className={gutterClasses} style={{ lineHeight }}>
            {wrappedLineNumbers.map((lineNumber, index) => (
              <div key={index}>{lineNumber ?? <>&nbsp;</>}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            aria-label={ariaLabel}
            className={linedTextClasses}
            disabled={disabled}
            placeholder={placeholder}
            readOnly={readOnly}
            spellCheck={spellCheck}
            style={{ ...rest.style, lineHeight }}
            value={value}
            onChange={handleTextChange}
            onScroll={handleScroll}
            {...rest}
          />
          {isDragOver && <DropzoneLayout mode="overlay" text="Drop text file" variant="add" />}
        </div>
      );
    };

    return showLineNumbers ? renderLined() : renderStandard();
  },
);
