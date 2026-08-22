import { DownloadCloud, FileText, Trash2 } from 'lucide-react';
import { memo, useCallback, useMemo, useRef } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { errorHandler, ingredientRegistry } from '../../app/container';
import { InputType } from '../../core/InputType';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { readFile, triggerDownload } from '../../utilities/fileUtil';
import { CopyButton, TooltipButton } from '../shared/Button';
import { FilePicker } from '../shared/input/FilePicker';
import { TextareaInput } from '../shared/input/TextareaInput';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';

import type { JSX, ReactNode, RefObject } from 'react';
import type { InputPanelConfig, OutputPanelConfig, SpiceValue } from '../../core/IngredientRegistry';
import type { FilePickerRenderProps } from '../shared/input/FilePicker';

interface KitchenPanelProps {
  readonly type: 'input' | 'output';
}

interface KitchenPanelSectionProps {
  readonly data: string;
}

interface DefaultContentProps extends KitchenPanelSectionProps {
  readonly config: InputPanelConfig | null;
  readonly onDataChange: (data: string) => void;
  readonly onFileDrop: (file: File) => void;
  readonly textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

interface OutputContentProps extends KitchenPanelSectionProps {
  readonly config: OutputPanelConfig | null;
}

const DefaultContent = memo<DefaultContentProps>(({ config, data, onDataChange, onFileDrop, textareaRef }) => {
  const isTextareaDisabled = config?.mode === 'textarea' && (config.disabled ?? false);
  const placeholder = (config?.mode === 'textarea' && config.placeholder) || 'Place Raw Ingredients Here.';

  return (
    <TextareaInput
      value={data}
      disabled={isTextareaDisabled}
      placeholder={placeholder}
      showLineNumbers
      wrapperClasses="flex-1-min-0"
      onChange={onDataChange}
      onFileDrop={onFileDrop}
      textareaRef={textareaRef}
    />
  );
});

const OutputContent = memo<OutputContentProps>(({ config, data }) => {
  const placeholder = (config?.mode === 'textarea' ? config.placeholder : undefined) || 'Your Results Will Be Presented Here.';
  return <TextareaInput value={data} readOnly placeholder={placeholder} showLineNumbers wrapperClasses="flex-1-min-0" />;
});

const OutputDataContent = memo((): ReactNode => {
  const config = useKitchenStore((state) => state.outputPanelConfig);
  const data = useKitchenStore((state) => state.outputData);

  return <OutputContent config={config} data={data} />;
});

const InputDataContent = memo<{ readonly onFileRead: (file: File) => Promise<void> }>(({ onFileRead }): ReactNode => {
  const config = useKitchenStore((state) => state.inputPanelConfig);
  const data = useKitchenStore((state) => state.inputData);
  const setInputData = useKitchenStore((state) => state.setInputData);
  const startUpdateBatch = useKitchenStore((state) => state.startUpdateBatch);
  const endUpdateBatch = useKitchenStore((state) => state.endUpdateBatch);
  const updateSpice = useRecipeStore((state) => state.updateSpice);

  const targetIngredient = useRecipeStore((state) =>
    config?.mode === 'spiceEditor' ? state.ingredientsMap.get(config.targetIngredientId) : undefined,
  );

  const handleSpiceChange = useCallback(
    (spiceId: string, rawValue: SpiceValue): void => {
      if (!targetIngredient) {
        return;
      }
      updateSpice(targetIngredient.id, spiceId, rawValue);
    },
    [targetIngredient, updateSpice],
  );

  if (!(config?.mode === 'spiceEditor' && targetIngredient)) {
    return <DefaultContent config={config} data={data} onDataChange={setInputData} onFileDrop={onFileRead} />;
  }

  const definition = ingredientRegistry.get(targetIngredient.ingredientId);
  errorHandler.assert(definition, 'Could not find definition for target ingredient in spice editor.');

  return (
    <SpiceLayout
      ingredient={definition}
      currentSpices={targetIngredient.spices}
      containerClasses="space-y-2"
      onSpiceChange={handleSpiceChange}
      onLongPressStart={startUpdateBatch}
      onLongPressEnd={endUpdateBatch}
    />
  );
});

export const KitchenPanel = memo<KitchenPanelProps>(({ type }): JSX.Element => {
  const inputPanelConfig = useKitchenStore((state) => state.inputPanelConfig);
  const outputPanelConfig = useKitchenStore((state) => state.outputPanelConfig);

  const importOperationRef = useRef<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isInput = type === 'input';
  const config = isInput ? inputPanelConfig : outputPanelConfig;
  const title = config?.title?.() || (isInput ? 'Input' : 'Output');

  const data = useKitchenStore((state) => (isInput ? state.inputData : state.outputData));

  const handleFileRead = useCallback(async (file: File): Promise<void> => {
    const operationId = ++importOperationRef.current;

    const { result: buffer, error } = await errorHandler.attemptAsync<ArrayBuffer>(() => {
      return readFile(file, 'readAsArrayBuffer', 'File to ArrayBuffer');
    }, `Read File: ${file.name}`);

    if (operationId !== importOperationRef.current || error || !buffer) {
      return;
    }

    const stringResult = new InputType(buffer).cast('string');
    useKitchenStore.getState().setInputData(stringResult.value);
  }, []);

  const handleClearInput = useCallback((): void => {
    if (isInput) {
      useKitchenStore.getState().setInputData('');
      inputRef.current?.focus();
    }
  }, [isInput]);

  const handleDownloadOutput = useCallback((): void => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, '').replace('T', '_').replace(/:/g, '');
    const fileName = `baratie_output_${timestamp}.txt`;
    triggerDownload(data, fileName);
  }, [data]);

  const renderFilePickerTrigger = useCallback(
    ({ trigger }: FilePickerRenderProps) => (
      <TooltipButton
        icon={<FileText size={ICON_SIZES.SM} />}
        size="sm"
        variant="stealth"
        tooltipContent="Open File..."
        tooltipPosition="left"
        onClick={trigger}
      />
    ),
    [],
  );

  const renderActions = useMemo(() => {
    if (!isInput) {
      const defaultOutputActions: ReactNode[] = [
        <TooltipButton
          key="download-button"
          icon={<DownloadCloud size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          disabled={data.length === 0}
          tooltipContent="Save Output"
          tooltipPosition="left"
          onClick={handleDownloadOutput}
        />,
        <CopyButton key="copy-button" textToCopy={data} tooltipPosition="left" />,
      ];

      if (outputPanelConfig?.mode === 'custom' && typeof outputPanelConfig.actions === 'function') {
        return outputPanelConfig.actions(defaultOutputActions);
      }

      return defaultOutputActions;
    }

    const showClearButton = !inputPanelConfig || (inputPanelConfig.mode === 'textarea' && inputPanelConfig.showClear);

    const defaultInputActions: ReactNode[] = [
      <FilePicker key="file-picker" accept="*/*" onFileSelect={handleFileRead}>
        {renderFilePickerTrigger}
      </FilePicker>,
    ];

    if (showClearButton) {
      defaultInputActions.push(
        <TooltipButton
          key="clear-button"
          icon={<Trash2 size={ICON_SIZES.SM} />}
          size="sm"
          variant="danger"
          disabled={data.length === 0}
          tooltipContent="Clear Input"
          tooltipPosition="left"
          onClick={handleClearInput}
        />,
      );
    }

    if (inputPanelConfig?.mode === 'custom' && typeof inputPanelConfig.actions === 'function') {
      return inputPanelConfig.actions(defaultInputActions);
    }

    return defaultInputActions;
  }, [data, handleClearInput, handleDownloadOutput, handleFileRead, inputPanelConfig, isInput, outputPanelConfig, renderFilePickerTrigger]);

  const renderContent = useMemo((): ReactNode => {
    if (inputPanelConfig?.mode === 'custom' && typeof inputPanelConfig.content === 'function') {
      return inputPanelConfig.content();
    }

    return type === 'output' ? <OutputDataContent /> : <InputDataContent onFileRead={handleFileRead} />;
  }, [inputPanelConfig, type, handleFileRead]);

  return (
    <SectionLayout headerLeft={title} headerRight={renderActions} className="panel-half-height" contentClasses="flex-col-gap-2 h-full">
      {renderContent}
    </SectionLayout>
  );
});
