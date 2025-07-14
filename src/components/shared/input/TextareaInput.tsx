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

export const TextareaInput = memo(
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
  }: TextareaInputProps): JSX.Element => {
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

    const commonTextClasses = [
      'h-full',
      'w-full',
      'resize-none',
      'p-2.5',
      `text-${theme.contentPrimary}`,
      'outline-none',
      'allow-text-selection',
      `placeholder:text-${theme.contentTertiary}`,
    ];

    const baseTextClasses = [
      ...commonTextClasses,
      'rounded-md',
      'border',
      `border-${theme.borderPrimary}`,
      `bg-${theme.surfaceSecondary}`,
      `focus:ring-2 focus:ring-${theme.ring}`,
      'disabled:opacity-50',
    ]
      .filter(Boolean)
      .join(' ');

    const boxTextClasses = [
      'relative',
      'flex',
      'overflow-hidden',
      'rounded-md',
      'border',
      `border-${theme.borderPrimary}`,
      `bg-${theme.surfaceSecondary}`,
      `focus-within:ring-2 focus-within:ring-${theme.ring}`,
    ]
      .filter(Boolean)
      .join(' ');

    const linedTextClasses = [...commonTextClasses, 'bg-transparent'].filter(Boolean).join(' ');

    const renderStandard = (): JSX.Element => (
      <div className={['relative', wrapperClass].filter(Boolean).join(' ')} {...dropZoneProps}>
        <textarea
          ref={textareaRef}
          aria-label={ariaLabel}
          className={[baseTextClasses, textareaClass].filter(Boolean).join(' ')}
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

    const renderLined = (): JSX.Element => {
      const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
      }, []);

      const lineHeight = rest.style?.['lineHeight'] ?? '1.6';

      const boxContainerClasses = [boxTextClasses, disabled && 'opacity-50', wrapperClass, textareaClass].filter(Boolean).join(' ');
      const gutterClasses = [
        'shrink-0',
        'select-none',
        'overflow-y-hidden',
        `border-r border-${theme.borderPrimary}`,
        `bg-${theme.surfaceSecondary}`,
        'py-2.5',
        'pl-2.5',
        'pr-2',
        'text-right',
        `text-${theme.contentTertiary}`,
      ]
        .filter(Boolean)
        .join(' ');

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
