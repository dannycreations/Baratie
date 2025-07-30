import { memo, useCallback, useMemo, useRef } from 'react';

import { errorHandler, ingredientRegistry, kitchen } from '../../app/container';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { readAsText, triggerDownload } from '../../utilities/fileUtil';
import { CopyButton, TooltipButton } from '../shared/Button';
import { DownloadCloudIcon, FileTextIcon, Trash2Icon } from '../shared/Icon';
import { FilePicker } from '../shared/input/FilePicker';
import { TextareaInput } from '../shared/input/TextareaInput';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';

import type { JSX } from 'react';
import type { IngredientItem, InputPanelConfig, OutputPanelConfig, SpiceValue } from '../../core/IngredientRegistry';

interface KitchenPanelProps {
  readonly type: 'input' | 'output';
}

interface KitchenPanelSectionProps {
  readonly data: string;
}

interface InputActionsProps extends KitchenPanelSectionProps {
  readonly config: InputPanelConfig | null;
  readonly onClear: () => void;
  readonly onFileSelect: (file: File) => void;
}

interface OutputActionsProps extends KitchenPanelSectionProps {
  readonly onDownload: () => void;
}

interface SpiceContentProps {
  readonly targetIngredient: IngredientItem;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, rawValue: SpiceValue) => void;
  readonly onLongPressEnd: () => void;
  readonly onLongPressStart: () => void;
}

interface DefaultContentProps extends KitchenPanelSectionProps {
  readonly config: InputPanelConfig | null;
  readonly onDataChange: (data: string) => void;
  readonly onFileDrop: (file: File) => void;
}

interface OutputContentProps extends KitchenPanelSectionProps {
  readonly config: OutputPanelConfig | null;
}

const InputActions = memo<InputActionsProps>(({ data, config, onClear, onFileSelect }) => {
  const showClearButton = !config || (config.mode === 'textarea' && config.showClear);

  return (
    <>
      <FilePicker accept="text/*" onFileSelect={onFileSelect}>
        {({ trigger }) => (
          <TooltipButton
            icon={<FileTextIcon size={18} />}
            size="sm"
            variant="stealth"
            aria-label="Open a text file as input"
            tooltipContent="Open File..."
            tooltipPosition="left"
            onClick={trigger}
          />
        )}
      </FilePicker>
      {showClearButton && (
        <TooltipButton
          icon={<Trash2Icon size={18} />}
          size="sm"
          variant="danger"
          disabled={data.length === 0}
          aria-label="Clear data from the input panel"
          tooltipContent="Clear Input Panel"
          tooltipPosition="left"
          onClick={onClear}
        />
      )}
    </>
  );
});

const OutputActions = memo<OutputActionsProps>(({ data, onDownload }) => (
  <>
    <TooltipButton
      icon={<DownloadCloudIcon size={18} />}
      size="sm"
      variant="stealth"
      disabled={data.length === 0}
      aria-label="Save output to a file"
      tooltipContent="Save Output"
      tooltipPosition="left"
      onClick={onDownload}
    />
    <CopyButton textToCopy={data} tooltipPosition="left" />
  </>
));

const SpiceContent = memo<SpiceContentProps>(({ onSpiceChange, targetIngredient, onLongPressStart, onLongPressEnd }) => {
  const handleSpiceChange = useCallback(
    (spiceId: string, rawValue: SpiceValue): void => {
      onSpiceChange(targetIngredient.id, spiceId, rawValue);
    },
    [onSpiceChange, targetIngredient.id],
  );

  const definition = ingredientRegistry.getIngredient(targetIngredient.ingredientId);
  errorHandler.assert(definition, 'Could not find definition for target ingredient in spice editor.');

  return (
    <div aria-label={`Parameters for ${definition.name}`}>
      <SpiceLayout
        ingredient={definition}
        currentSpices={targetIngredient.spices}
        containerClasses="space-y-2"
        onSpiceChange={handleSpiceChange}
        onLongPressStart={onLongPressStart}
        onLongPressEnd={onLongPressEnd}
      />
    </div>
  );
});

const DefaultContent = memo<DefaultContentProps>(({ config, data, onDataChange, onFileDrop }) => {
  const isTextareaDisabled = config?.mode === 'textarea' ? !!config.disabled : false;
  const placeholder = (config?.mode === 'textarea' && config.placeholder) || 'Place Raw Ingredients Here.';

  return (
    <TextareaInput
      value={data}
      aria-label="Input Panel for Raw Data"
      disabled={isTextareaDisabled}
      placeholder={placeholder}
      showLineNumbers
      wrapperClasses="flex-1 min-h-0"
      onChange={onDataChange}
      onFileDrop={onFileDrop}
    />
  );
});

const OutputContent = memo<OutputContentProps>(({ config, data }) => (
  <TextareaInput
    value={data}
    readOnly
    aria-label="Result from Recipe Cooking Action"
    placeholder={config?.placeholder || 'Your Results Will Be Presented Here.'}
    showLineNumbers
    wrapperClasses="flex-1 min-h-0"
  />
));

export const KitchenPanel = memo<KitchenPanelProps>(({ type }): JSX.Element => {
  const inputPanelConfig = useKitchenStore((state) => state.inputPanelConfig);
  const outputPanelConfig = useKitchenStore((state) => state.outputPanelConfig);
  const inputData = useKitchenStore((state) => state.inputData);
  const outputData = useKitchenStore((state) => state.outputData);
  const startUpdateBatch = useKitchenStore((state) => state.startUpdateBatch);
  const endUpdateBatch = useKitchenStore((state) => state.endUpdateBatch);
  const ingredients = useRecipeStore((state) => state.ingredients);

  const importOperationRef = useRef<number>(0);

  const targetIngredient = useMemo((): IngredientItem | undefined => {
    if (inputPanelConfig?.mode === 'spiceEditor') {
      return ingredients.find((ing) => ing.id === inputPanelConfig.targetIngredientId);
    }
    return undefined;
  }, [ingredients, inputPanelConfig]);

  const isInput = type === 'input';
  const data = isInput ? inputData : outputData;
  const config = isInput ? inputPanelConfig : outputPanelConfig;
  const title = config?.title || (isInput ? 'Input' : 'Output');

  const handleSetInputData = useCallback((data: string): void => kitchen.setInputData(data), []);

  const handleFileRead = useCallback(
    async (file: File): Promise<void> => {
      const operationId = ++importOperationRef.current;

      const { result: text, error } = await errorHandler.attemptAsync(() => readAsText(file));
      if (operationId === importOperationRef.current && !error && typeof text === 'string') {
        handleSetInputData(text);
      }
    },
    [handleSetInputData],
  );

  const handleClearInput = useCallback((): void => {
    if (isInput) {
      handleSetInputData('');
    }
  }, [isInput, handleSetInputData]);

  const handleDownloadOutput = useCallback((): void => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, '').replace('T', '_').replace(/:/g, '');
    const fileName = `baratie_output_${timestamp}.txt`;
    triggerDownload(data, fileName);
  }, [data]);

  const handleSpiceChange = useCallback((id: string, spiceId: string, rawValue: SpiceValue): void => {
    useRecipeStore.getState().updateSpice(id, spiceId, rawValue);
  }, []);

  const headerActions = isInput ? (
    <InputActions config={inputPanelConfig} data={data} onClear={handleClearInput} onFileSelect={handleFileRead} />
  ) : (
    <OutputActions data={data} onDownload={handleDownloadOutput} />
  );

  const renderContent = (): JSX.Element => {
    if (!isInput) {
      return <OutputContent config={outputPanelConfig} data={outputData} />;
    }
    if (inputPanelConfig?.mode === 'spiceEditor' && targetIngredient) {
      return (
        <SpiceContent
          targetIngredient={targetIngredient}
          onSpiceChange={handleSpiceChange}
          onLongPressStart={startUpdateBatch}
          onLongPressEnd={endUpdateBatch}
        />
      );
    }
    return <DefaultContent config={inputPanelConfig} data={inputData} onDataChange={handleSetInputData} onFileDrop={handleFileRead} />;
  };

  return (
    <SectionLayout
      headerLeft={title}
      headerRight={headerActions}
      className="h-[50vh] min-h-0 md:h-1/2"
      contentClasses="flex flex-col"
      aria-live={config ? 'polite' : undefined}
    >
      {renderContent()}
    </SectionLayout>
  );
});
