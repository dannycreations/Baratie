import { memo, useCallback, useMemo, useRef } from 'react';

import { errorHandler, ingredientRegistry, kitchen } from '../../app/container';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { readAsText, triggerDownload } from '../../utilities/fileUtil';
import { CopyButton, TooltipButton } from '../shared/Button';
import { DownloadCloudIcon, FileTextIcon, Trash2Icon } from '../shared/Icon';
import { TextareaInput } from '../shared/input/TextareaInput';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';

import type { ChangeEvent, JSX, RefObject } from 'react';
import type { IngredientItem, InputPanelConfig, OutputPanelConfig, SpiceDefinition, SpiceValue } from '../../core/IngredientRegistry';

interface KitchenPanelProps {
  readonly type: 'input' | 'output';
}

interface KitchenPanelSectionProps {
  readonly data: string;
}

interface InputActionsProps extends KitchenPanelSectionProps {
  readonly config: InputPanelConfig | null;
  readonly onClear: () => void;
  readonly onTriggerFileSelect: () => void;
}

interface OutputActionsProps extends KitchenPanelSectionProps {
  readonly onDownload: () => void;
}

interface SpiceContentProps {
  readonly onSpiceChange: (ingredientId: string, spiceId: string, rawValue: SpiceValue, spice: SpiceDefinition) => void;
  readonly targetIngredient: IngredientItem;
}

interface DefaultContentProps extends KitchenPanelSectionProps {
  readonly config: InputPanelConfig | null;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
}

interface OutputContentProps extends KitchenPanelSectionProps {
  readonly config: OutputPanelConfig | null;
}

const InputActions = memo<InputActionsProps>(({ data, config, onClear, onTriggerFileSelect }) => {
  const showClearButton = config?.mode !== 'textarea' || config.showClear;

  return (
    <>
      <TooltipButton
        aria-label="Open a text file as input"
        icon={<FileTextIcon size={18} />}
        size="sm"
        tooltipContent="Open File..."
        tooltipPosition="left"
        variant="stealth"
        onClick={onTriggerFileSelect}
      />
      {showClearButton && (
        <TooltipButton
          aria-label="Clear data from the input panel"
          disabled={data.length === 0}
          icon={<Trash2Icon size={18} />}
          size="sm"
          tooltipContent="Clear Input Panel"
          tooltipPosition="left"
          variant="danger"
          onClick={onClear}
        />
      )}
    </>
  );
});

const OutputActions = memo<OutputActionsProps>(({ data, onDownload }) => (
  <>
    <TooltipButton
      aria-label="Save output to a file"
      disabled={data.length === 0}
      icon={<DownloadCloudIcon size={18} />}
      size="sm"
      tooltipContent="Save Output"
      tooltipPosition="left"
      variant="stealth"
      onClick={onDownload}
    />
    <CopyButton textToCopy={data} tooltipPosition="left" />
  </>
));

const SpiceContent = memo<SpiceContentProps>(({ onSpiceChange, targetIngredient }) => {
  const handleSpiceChange = useCallback(
    (spiceId: string, rawValue: SpiceValue, spice: SpiceDefinition) => {
      onSpiceChange(targetIngredient.id, spiceId, rawValue, spice);
    },
    [onSpiceChange, targetIngredient.id],
  );

  const definition = ingredientRegistry.getIngredient(targetIngredient.ingredientId);
  errorHandler.assert(definition, 'Could not find definition for target ingredient in spice editor.');

  return (
    <div aria-label={`Parameters for ${definition.name}`} className="overflow-y-auto p-3">
      <SpiceLayout containerClasses="space-y-3" currentSpices={targetIngredient.spices} ingredient={definition} onSpiceChange={handleSpiceChange} />
    </div>
  );
});

const DefaultContent = memo<DefaultContentProps>(({ config, data, fileInputRef, onFileSelected }) => {
  const isTextareaDisabled = config?.mode === 'textarea' ? !!config.disabled : false;
  const placeholder = (config?.mode === 'textarea' && config.placeholder) || 'Place Raw Ingredients Here.';

  return (
    <>
      <input ref={fileInputRef} accept="text/*" type="file" aria-hidden="true" className="hidden" onChange={onFileSelected} />
      <TextareaInput
        aria-label="Input Panel for Raw Data"
        disabled={isTextareaDisabled}
        placeholder={placeholder}
        showLineNumbers={true}
        textareaClasses="font-mono"
        value={data}
        wrapperClasses="flex-1 min-h-0"
        onChange={kitchen.setInputData}
      />
    </>
  );
});

const OutputContent = memo<OutputContentProps>(({ config, data }) => (
  <TextareaInput
    aria-label="Result from Recipe Cooking Action"
    placeholder={config?.placeholder || 'Your Results Will Be Presented Here.'}
    showLineNumbers={true}
    textareaClasses="font-mono"
    value={data}
    wrapperClasses="flex-1 min-h-0"
  />
));

export const KitchenPanel = memo<KitchenPanelProps>(({ type }): JSX.Element => {
  const inputPanelConfig = useKitchenStore((state) => state.inputPanelConfig);
  const outputPanelConfig = useKitchenStore((state) => state.outputPanelConfig);
  const inputData = useKitchenStore((state) => state.inputData);
  const outputData = useKitchenStore((state) => state.outputData);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const updateSpice = useRecipeStore((state) => state.updateSpice);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importOperationRef = useRef<number>(0);

  const targetIngredient = useMemo(() => {
    if (inputPanelConfig?.mode === 'spiceEditor') {
      return ingredients.find((ing) => ing.id === inputPanelConfig.targetIngredientId);
    }
    return undefined;
  }, [ingredients, inputPanelConfig]);

  const isInput = type === 'input';
  const data = isInput ? inputData : outputData;
  const config = isInput ? inputPanelConfig : outputPanelConfig;
  const title = config?.title || (isInput ? 'Input' : 'Output');

  const handleFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const operationId = ++importOperationRef.current;
    const file = event.target.files?.[0];

    if (file) {
      const { result: text, error } = await errorHandler.attemptAsync(() => readAsText(file));
      if (operationId === importOperationRef.current && !error && typeof text === 'string') {
        kitchen.setInputData(text);
      }
    }

    if (event.target) {
      event.target.value = '';
    }
  }, []);

  const handleTriggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClearInput = useCallback(() => {
    if (isInput) {
      kitchen.setInputData('');
    }
  }, [isInput]);

  const handleDownloadOutput = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, '').replace('T', '_').replace(/:/g, '');
    const fileName = `baratie_output_${timestamp}.txt`;
    triggerDownload(data, fileName);
  }, [data]);

  const headerActions = isInput ? (
    <InputActions config={inputPanelConfig} data={data} onClear={handleClearInput} onTriggerFileSelect={handleTriggerFileSelect} />
  ) : (
    <OutputActions data={data} onDownload={handleDownloadOutput} />
  );

  const renderContent = (): JSX.Element => {
    if (!isInput) {
      return <OutputContent config={outputPanelConfig} data={outputData} />;
    }
    if (inputPanelConfig?.mode === 'spiceEditor' && targetIngredient) {
      return <SpiceContent targetIngredient={targetIngredient} onSpiceChange={updateSpice} />;
    }
    return <DefaultContent config={inputPanelConfig} data={inputData} fileInputRef={fileInputRef} onFileSelected={handleFileSelect} />;
  };

  return (
    <SectionLayout
      aria-live={config ? 'polite' : undefined}
      contentClasses="flex flex-col"
      headerLeft={title}
      headerRight={headerActions}
      panelClasses="h-[50vh] min-h-0 md:h-1/2"
    >
      {renderContent()}
    </SectionLayout>
  );
});
