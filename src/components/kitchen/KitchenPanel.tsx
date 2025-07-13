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

import type { ChangeEvent, JSX } from 'react';
import type { SpiceDefinition } from '../../core/IngredientRegistry';

interface KitchenPanelProps {
  readonly type: 'input' | 'output';
}

export const KitchenPanel = memo(function KitchenPanel({ type }: KitchenPanelProps): JSX.Element {
  const inputPanelConfig = useKitchenStore((state) => state.inputPanelConfig);
  const outputPanelConfig = useKitchenStore((state) => state.outputPanelConfig);
  const inputData = useKitchenStore((state) => state.inputData);
  const outputData = useKitchenStore((state) => state.outputData);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const updateSpice = useRecipeStore((state) => state.updateSpice);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importOperationRef = useRef(0);

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
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now
      .getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const fileName = `baratie_output_${timestamp}.txt`;
    triggerDownload(data, fileName);
  }, [data]);

  const handleSpiceChange = useCallback(
    (spiceId: string, rawValue: string | boolean | number, spice: SpiceDefinition) => {
      if (inputPanelConfig?.mode !== 'spiceEditor') return;
      updateSpice(inputPanelConfig.targetIngredientId, spiceId, rawValue, spice);
    },
    [inputPanelConfig, updateSpice],
  );

  const headerActions = useMemo(() => {
    if (isInput) {
      let canClear = true;
      if (inputPanelConfig?.mode === 'textarea') {
        canClear = inputPanelConfig.showClear;
      }

      return (
        <>
          <TooltipButton
            aria-label="Open a text file as input"
            icon={<FileTextIcon size={18} />}
            onClick={handleTriggerFileSelect}
            size="sm"
            tooltipContent="Open File..."
            tooltipPosition="left"
            variant="stealth"
          />
          {canClear && (
            <TooltipButton
              aria-label="Clear data from the input panel"
              disabled={data.length === 0}
              icon={<Trash2Icon size={18} />}
              onClick={handleClearInput}
              size="sm"
              tooltipContent="Clear Input Panel"
              tooltipPosition="left"
              variant="danger"
            />
          )}
        </>
      );
    }
    return (
      <>
        <TooltipButton
          aria-label="Save output to a file"
          disabled={data.length === 0}
          icon={<DownloadCloudIcon size={18} />}
          onClick={handleDownloadOutput}
          size="sm"
          tooltipContent="Save Output"
          tooltipPosition="left"
          variant="stealth"
        />
        <CopyButton textToCopy={data} tooltipPosition="left" />
      </>
    );
  }, [isInput, data, inputPanelConfig, handleClearInput, handleTriggerFileSelect, handleDownloadOutput]);

  const content = useMemo(() => {
    if (isInput) {
      if (inputPanelConfig?.mode === 'spiceEditor') {
        const targetIngredient = ingredients.find((ing) => ing.id === inputPanelConfig.targetIngredientId);
        if (!targetIngredient) return null;
        const definition = ingredientRegistry.getIngredient(targetIngredient.name);
        errorHandler.assert(definition, 'Could not find definition for target ingredient in spice editor.');

        return (
          <div className="overflow-y-auto p-3" aria-label={`Parameters for ${targetIngredient.name.description}`}>
            <SpiceLayout
              containerClassName="space-y-3"
              currentSpices={targetIngredient.spices}
              ingredientDefinition={definition}
              onSpiceChange={handleSpiceChange}
            />
          </div>
        );
      }
      return (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            aria-hidden="true"
            accept="text/*,.json,.csv,application/xml"
            onChange={handleFileSelect}
          />
          <TextareaInput
            ariaLabel="Input Panel for Raw Data"
            disabled={inputPanelConfig?.disabled}
            onChange={kitchen.setInputData}
            placeholder={inputPanelConfig?.placeholder || 'Place Raw Ingredients Here.'}
            showLineNumbers={true}
            spellCheck="false"
            textareaClass="font-mono"
            value={data}
            wrapperClass="flex-1 min-h-0"
          />
        </>
      );
    }

    return (
      <TextareaInput
        ariaLabel="Result from Recipe Cooking Action"
        placeholder={outputPanelConfig?.placeholder || 'Your Results Will Be Presented Here.'}
        readOnly
        showLineNumbers={true}
        spellCheck="false"
        textareaClass="font-mono"
        value={data}
        wrapperClass="flex-1 min-h-0"
      />
    );
  }, [isInput, inputPanelConfig, ingredients, handleSpiceChange, handleFileSelect, data, outputPanelConfig]);

  return (
    <SectionLayout
      ariaLive={config ? 'polite' : undefined}
      cardClassName="flex-1 min-h-0"
      cardContentClassName="flex flex-col"
      headerActions={headerActions}
      title={title}
    >
      {content}
    </SectionLayout>
  );
});
