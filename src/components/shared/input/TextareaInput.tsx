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
  readonly textareaClasses?: string;
  readonly value: string;
  readonly wrapperClasses?: string;
  readonly onChange?: (value: string) => void;
}

export const TextareaInput = memo<TextareaInputProps>(
  ({
    value,
    onChange,
    readOnly = false,
    wrapperClasses = '',
    textareaClasses = '',
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

    const commonTextAreaProps: TextareaHTMLAttributes<HTMLTextAreaElement> = {
      'aria-label': ariaLabel,
      disabled,
      placeholder,
      readOnly,
      spellCheck,
      value,
      onChange: handleTextChange,
      ...rest,
    };

    const dropzoneComponent = isDragOver && <DropzoneLayout mode="overlay" text="Drop text file" variant="add" />;

    if (showLineNumbers) {
      const handleScroll = (event: UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
      };

      const lineHeight = rest.style?.['lineHeight'] ?? '1.6';
      const boxContainerClass =
        `relative flex overflow-hidden rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} focus-within:ring-2 focus-within:ring-${theme.ring} ${
          disabled ? 'opacity-50' : ''
        } ${wrapperClasses}`.trim();
      const gutterClass = `shrink-0 select-none overflow-y-hidden border-r border-${theme.borderPrimary} bg-${theme.surfaceSecondary} py-2.5 pl-2.5 pr-2 text-right text-${theme.contentTertiary}`;
      const linedTextClass = `${commonTextStyles} bg-transparent ${textareaClasses}`;

      return (
        <div className={boxContainerClass} {...dropZoneProps}>
          <div ref={lineNumbersRef} aria-hidden="true" className={gutterClass} style={{ lineHeight }}>
            {wrappedLineNumbers.map((lineNumber, index) => (
              <div key={index}>{lineNumber ?? <>&nbsp;</>}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            {...commonTextAreaProps}
            className={linedTextClass}
            style={{ ...rest.style, lineHeight }}
            onScroll={handleScroll}
          />
          {dropzoneComponent}
        </div>
      );
    }

    const baseTextClass = `${commonTextStyles} rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceSecondary} focus:ring-2 focus:ring-${theme.ring} disabled:opacity-50 ${textareaClasses}`;

    return (
      <div className={`relative ${wrapperClasses}`} {...dropZoneProps}>
        <textarea ref={textareaRef} {...commonTextAreaProps} className={baseTextClass} />
        {dropzoneComponent}
      </div>
    );
  },
);
