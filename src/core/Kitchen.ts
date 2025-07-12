import { KEY_REPEAT_STEP } from '../app/constants';
import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { useKitchenStore } from '../stores/useKitchenStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { AppError } from './ErrorHandler';
import { InputType } from './InputType';

import type {
  Ingredient,
  IngredientContext,
  IngredientDefinition,
  InputPanelConfig,
  OutputPanelConfig,
  PanelControlConfig,
  PanelControlSignal,
  ResultType,
} from './IngredientRegistry';

export type CookingStatusType = 'idle' | 'error' | 'success' | 'warning';

export interface RecipeCookResult {
  readonly inputPanelConfig: InputPanelConfig | null;
  readonly outputPanelConfig: OutputPanelConfig | null;
  readonly cookingStatus: CookingStatusType;
  readonly ingredientStatuses: Readonly<Record<string, CookingStatusType>>;
  readonly inputPanelIngId: string | null;
  readonly outputData: string;
}

interface CookLoopResult {
  readonly cookedData: string;
  readonly globalError: boolean;
  readonly hasWarnings: boolean;
  readonly lastInputConfig: InputPanelConfig | null;
  readonly lastOutputConfig: OutputPanelConfig | null;
  readonly lastInputPanelId: string | null;
  readonly localStatuses: Record<string, CookingStatusType>;
}

interface IngredientRunResult {
  readonly hasError: boolean;
  readonly nextData: string;
  readonly panelInstruction?: PanelControlConfig;
  readonly status: CookingStatusType;
  readonly inputPanelIngId?: string | null;
}

interface ProcessedRunResult {
  readonly nextData: string;
  readonly panelInstruction: PanelControlConfig | undefined;
  readonly status: CookingStatusType;
}

function isPanelSignal(value: unknown): value is PanelControlSignal {
  if (typeof value !== 'object' || value === null || value instanceof InputType) {
    return false;
  }
  return 'output' in value && (value as { output: unknown }).output instanceof InputType;
}

class CookCancelledError extends Error {
  public constructor() {
    super('Cook operation cancelled by a newer request.');
    this.name = 'CookCancelledError';
  }
}

export class Kitchen {
  private cookVersion = 0;
  private isCooking = false;
  private timeoutId: number | null = null;
  private intervalMs = 0;

  public toggleAutoCook = (): void => {
    const wasEnabled = useKitchenStore.getState().isAutoCookEnabled;
    useKitchenStore.getState().toggleAutoCookState();

    if (!wasEnabled) {
      this.triggerCook();
    } else {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
        logger.info('Auto-cook disabled, pending scheduled cook cancelled.');
      }
    }
  };

  public async cook(): Promise<void> {
    this.cookVersion++;
    const cookId = this.cookVersion;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.isCooking) {
      logger.info('Cook request queued; another cook is in progress.', { queuedVersion: cookId });
      return;
    }

    this.isCooking = true;
    logger.info(`Starting cook, version ${cookId}.`);

    try {
      const { inputData } = useKitchenStore.getState();
      const recipe = useRecipeStore.getState().ingredients;

      const hasIntervalSetter = recipe.some((ing) => ing.name === KEY_REPEAT_STEP);
      if (!hasIntervalSetter && this.intervalMs > 0) {
        this.setCookingInterval(0);
      }

      const result = await this.cookRecipe(recipe, inputData, cookId);

      if (this.cookVersion === cookId) {
        useKitchenStore.getState().setCookingResult(result);
        this.scheduleNextCook();
      }
    } catch (error) {
      if (error instanceof CookCancelledError) {
        logger.info(error.message);
      } else {
        if (this.cookVersion === cookId) {
          this.scheduleNextCook();
        }
        throw error;
      }
    } finally {
      this.isCooking = false;
      if (this.cookVersion > cookId) {
        this.triggerCook();
      }
    }
  }

  public async cookSubRecipe(subRecipe: readonly Ingredient[], input: string, parentContext: IngredientContext, cookId: number): Promise<string> {
    let currentData = input;
    for (const subIngredient of subRecipe) {
      if (this.cookVersion !== cookId) throw new CookCancelledError();

      const subDefinition = ingredientRegistry.getIngredient(subIngredient.name);
      errorHandler.assert(subDefinition, `cookSubRecipe: Definition for '${subIngredient.name.description}' not found.`);
      const subIndex = parentContext.recipe.findIndex((ingredient) => ingredient.id === subIngredient.id);
      errorHandler.assert(subIndex !== -1, `cookSubRecipe: Could not find original index for '${subIngredient.name.description}'.`);
      const subContext: IngredientContext = { ...parentContext, currentIndex: subIndex, ingredient: subIngredient };
      const runResult = await subDefinition.run(new InputType(currentData), subIngredient.spices, subContext);
      currentData = this.processRunResult(runResult, currentData, subIngredient).nextData;
    }
    return currentData;
  }

  public setCookingInterval(ms: number): void {
    const newMs = Math.max(0, ms);
    if (newMs !== this.intervalMs) {
      this.intervalMs = newMs;
      logger.info(`Cooking interval set to ${this.intervalMs}ms.`);

      if (!this.isCooking) {
        this.scheduleNextCook();
      }
    }
  }

  public setInputData(data: string): void {
    useKitchenStore.getState().setInputData(data);
  }

  public initAutoCook(): () => void {
    const handleStateChange = () => {
      if (useKitchenStore.getState().isAutoCookEnabled) {
        this.triggerCook();
      }
    };
    const unsubscribeKitchen = useKitchenStore.subscribe((state) => state.inputData, handleStateChange);
    const unsubscribeRecipe = useRecipeStore.subscribe((state) => state.ingredients, handleStateChange);
    return () => {
      unsubscribeKitchen();
      unsubscribeRecipe();
    };
  }

  private async cookRecipe(recipe: readonly Ingredient[], initialInput: string, cookId: number): Promise<RecipeCookResult> {
    if (this.cookVersion !== cookId) throw new CookCancelledError();
    if (recipe.length === 0) {
      return {
        inputPanelConfig: null,
        outputPanelConfig: null,
        cookingStatus: 'idle',
        ingredientStatuses: {},
        inputPanelIngId: null,
        outputData: '',
      };
    }

    const loopResult = await this.executeRecipeLoop(recipe, initialInput, cookId);
    const finalStatus: CookingStatusType = loopResult.globalError ? 'error' : loopResult.hasWarnings ? 'warning' : 'success';
    logger.info(`Cook version ${this.cookVersion} finished with status: ${finalStatus}.`);

    return {
      inputPanelConfig: loopResult.lastInputConfig,
      outputPanelConfig: loopResult.lastOutputConfig,
      cookingStatus: finalStatus,
      ingredientStatuses: loopResult.localStatuses,
      inputPanelIngId: loopResult.lastInputPanelId,
      outputData: loopResult.cookedData,
    };
  }

  private async executeRecipeLoop(recipe: readonly Ingredient[], initialInput: string, cookId: number): Promise<CookLoopResult> {
    let cookedData = initialInput;
    const localStatuses: Record<string, CookingStatusType> = {};
    let lastInputConfig: InputPanelConfig | null = null;
    let lastOutputConfig: OutputPanelConfig | null = null;
    let lastInputPanelId: string | null = null;
    let globalError = false;
    let hasWarnings = false;

    for (let index = 0; index < recipe.length; index++) {
      if (this.cookVersion !== cookId) throw new CookCancelledError();

      const ingredient = recipe[index];
      const definition = ingredientRegistry.getIngredient(ingredient.name);
      if (!definition) {
        errorHandler.handle(
          new AppError(
            `Definition for '${ingredient.name.description}' not found.`,
            'Recipe Cooking',
            `Ingredient '${ingredient.name.description}' is misconfigured.`,
          ),
        );
        cookedData = `Error: Definition for ${ingredient.name.description} not found.`;
        localStatuses[ingredient.id] = 'error';
        globalError = true;
        break;
      }

      const { hasError, inputPanelIngId, nextData, panelInstruction, status } = await this.runIngredient(
        ingredient,
        definition,
        cookedData,
        recipe,
        index,
        initialInput,
        cookId,
      );
      cookedData = nextData;
      localStatuses[ingredient.id] = status;

      if (panelInstruction) {
        if (panelInstruction.panelType === 'input') {
          lastInputConfig = panelInstruction.config;
          lastInputPanelId = inputPanelIngId ?? null;
        } else if (panelInstruction.panelType === 'output') {
          lastOutputConfig = panelInstruction.config;
        }
      }

      if (hasError) {
        globalError = true;
        break;
      }
      if (status === 'warning') {
        hasWarnings = true;
      }
    }
    return { cookedData, localStatuses, lastInputConfig, lastOutputConfig, lastInputPanelId, globalError, hasWarnings };
  }

  private processRunResult(runResult: ResultType, currentData: string, ingredient: Ingredient): ProcessedRunResult {
    if (runResult === null) {
      logger.info(`Ingredient '${ingredient.name.description}' was skipped (returned null).`);
      return { nextData: currentData, status: 'warning', panelInstruction: undefined };
    }
    if (isPanelSignal(runResult)) {
      return {
        nextData: runResult.output.cast('string').getValue(),
        status: 'success',
        panelInstruction: runResult.panelControl,
      };
    }
    if (runResult instanceof InputType) {
      return { nextData: runResult.cast('string').getValue(), status: 'success', panelInstruction: undefined };
    }
    errorHandler.assert(false, `Ingredient '${ingredient.name.description}' returned an invalid result type.`);
  }

  private async runIngredient(
    ingredient: Ingredient,
    definition: IngredientDefinition,
    currentData: string,
    recipe: readonly Ingredient[],
    currentIndex: number,
    initialInput: string,
    cookId: number,
  ): Promise<IngredientRunResult> {
    errorHandler.assert(definition.run, `Runner for '${ingredient.name.description}' not found.`);
    logger.debug(`Running ingredient: ${ingredient.name.description}`, { id: ingredient.id, index: currentIndex });

    const context: IngredientContext = { cookVersion: cookId, currentIndex, ingredient, initialInput, recipe };
    const { error, result } = await errorHandler.attemptAsync(() => definition.run(new InputType(currentData), ingredient.spices, context));

    if (error) {
      if (error instanceof CookCancelledError) throw error;
      return { hasError: true, nextData: `Error: ${error.message}`, status: 'error' };
    }

    const { nextData, panelInstruction, status } = this.processRunResult(result, currentData, ingredient);
    if (status === 'error') {
      return { hasError: true, nextData, status };
    }

    let inputPanelIngId: string | null = null;
    if (panelInstruction?.panelType === 'input') {
      const inputConfig = panelInstruction.config;
      if (inputConfig.mode === 'spiceEditor') {
        inputPanelIngId = inputConfig.targetIngredientId;
      }
    }

    return { hasError: false, inputPanelIngId, nextData, panelInstruction, status };
  }

  private scheduleNextCook(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.intervalMs > 0 && useKitchenStore.getState().isAutoCookEnabled) {
      this.timeoutId = window.setTimeout(() => {
        this.triggerCook();
      }, this.intervalMs);
      logger.info(`Next cook scheduled in ${this.intervalMs}ms.`);
    }
  }

  private triggerCook(): void {
    this.cook().catch((error) => {
      if (!(error instanceof CookCancelledError)) {
        logger.error('Error during automatic cook execution:', error);
      }
    });
  }
}
