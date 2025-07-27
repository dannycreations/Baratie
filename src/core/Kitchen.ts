import { KEY_REPEAT_STEP } from '../app/constants';
import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { useKitchenStore } from '../stores/useKitchenStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { AppError } from './ErrorHandler';
import { InputType } from './InputType';

import type { KitchenState } from '../stores/useKitchenStore';
import type {
  IngredientContext,
  IngredientDefinition,
  IngredientItem,
  InputPanelConfig,
  OutputPanelConfig,
  PanelControlConfig,
  PanelControlSignal,
  ResultType,
} from './IngredientRegistry';

export type CookingStatusType = 'idle' | 'error' | 'success' | 'warning';

export type RecipeCookResult = Pick<
  KitchenState,
  'cookingStatus' | 'ingredientStatuses' | 'inputPanelConfig' | 'inputPanelId' | 'outputData' | 'outputPanelConfig'
>;

interface RecipeLoopState {
  cookedData: string;
  globalError: boolean;
  hasWarnings: boolean;
  lastInputConfig: InputPanelConfig | null;
  lastInputPanelId: string | null;
  lastOutputConfig: OutputPanelConfig | null;
  localStatuses: Record<string, CookingStatusType>;
}

interface IngredientRunResult {
  readonly hasError: boolean;
  readonly inputPanelIngId?: string | null;
  readonly nextData: string;
  readonly panelInstruction?: PanelControlConfig;
  readonly status: CookingStatusType;
}

function isPanelControlSignal(value: ResultType): value is PanelControlSignal {
  return typeof value === 'object' && value !== null && 'output' in value && value.output instanceof InputType;
}

export class Kitchen {
  private hasPendingCook = false;
  private intervalMs = 0;
  private isCooking = false;
  private timeoutId: number | null = null;

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

  public async cook(): Promise<void> {
    if (this.isCooking) {
      logger.info('Cook request queued; another cook is in progress.');
      this.hasPendingCook = true;
      return;
    }

    this.isCooking = true;
    this.hasPendingCook = false;
    logger.info('Starting cook.');

    try {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      const { inputData } = useKitchenStore.getState();
      const recipe = useRecipeStore.getState().ingredients;
      const hasIntervalSetter = recipe.some((ing) => ing.name === KEY_REPEAT_STEP);

      if (!hasIntervalSetter && this.intervalMs > 0) {
        this.setCookingInterval(0);
      }

      const result = await this.cookRecipe(recipe, inputData);
      useKitchenStore.getState().setCookingResult(result);
      this.scheduleNextCook();
    } catch (error) {
      this.scheduleNextCook();
      throw error;
    } finally {
      this.isCooking = false;
      if (this.hasPendingCook) {
        this.triggerCook();
      }
    }
  }

  public setInputData(data: string): void {
    useKitchenStore.getState().setInputData(data);
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
      this.hasPendingCook = false;
    }
  };

  private async cookRecipe(recipe: ReadonlyArray<IngredientItem>, initialInput: string): Promise<RecipeCookResult> {
    if (recipe.length === 0) {
      return {
        cookingStatus: initialInput ? 'success' : 'idle',
        ingredientStatuses: {},
        inputPanelConfig: null,
        inputPanelId: null,
        outputData: initialInput,
        outputPanelConfig: null,
      };
    }

    const loopResult = await this.executeRecipeLoop(recipe, initialInput);
    const finalStatus: CookingStatusType = loopResult.globalError ? 'error' : loopResult.hasWarnings ? 'warning' : 'success';
    logger.info(`Cook finished with status: ${finalStatus}.`);

    return {
      cookingStatus: finalStatus,
      ingredientStatuses: loopResult.localStatuses,
      inputPanelConfig: loopResult.lastInputConfig,
      inputPanelId: loopResult.lastInputPanelId,
      outputData: loopResult.cookedData,
      outputPanelConfig: loopResult.lastOutputConfig,
    };
  }

  private async executeRecipeLoop(recipe: ReadonlyArray<IngredientItem>, initialInput: string): Promise<RecipeLoopState> {
    const state: RecipeLoopState = {
      cookedData: initialInput,
      globalError: false,
      hasWarnings: false,
      lastInputConfig: null,
      lastInputPanelId: null,
      lastOutputConfig: null,
      localStatuses: {},
    };

    for (let index = 0; index < recipe.length; index++) {
      const ingredient = recipe[index];
      const definition = ingredientRegistry.getIngredient(ingredient.ingredientId);

      if (!definition) {
        const errorMessage = `Ingredient '${ingredient.name}' is misconfigured or from a removed extension.`;
        errorHandler.handle(
          new AppError(`Definition for ID '${ingredient.ingredientId}' (${ingredient.name}) not found.`, 'Recipe Cooking', errorMessage),
        );
        state.cookedData = `Error: ${errorMessage}`;
        state.localStatuses[ingredient.id] = 'error';
        state.globalError = true;
        break;
      }

      const result = await this.runIngredient(ingredient, definition, state.cookedData, recipe, index, initialInput);
      state.cookedData = result.nextData;
      state.localStatuses[ingredient.id] = result.status;

      if (result.panelInstruction) {
        if (result.panelInstruction.panelType === 'input') {
          state.lastInputConfig = result.panelInstruction.config;
          state.lastInputPanelId = result.inputPanelIngId ?? null;
        } else if (result.panelInstruction.panelType === 'output') {
          state.lastOutputConfig = result.panelInstruction.config;
        }
      }

      if (result.hasError) {
        state.globalError = true;
        break;
      }
      if (result.status === 'warning') {
        state.hasWarnings = true;
      }
    }
    return state;
  }

  private async runIngredient(
    ingredient: IngredientItem,
    definition: IngredientDefinition,
    currentData: string,
    recipe: ReadonlyArray<IngredientItem>,
    currentIndex: number,
    initialInput: string,
  ): Promise<IngredientRunResult> {
    errorHandler.assert(definition.run, `Runner for '${definition.name}' not found.`);
    logger.debug(`Running ingredient: ${definition.name}`, { id: ingredient.id, index: currentIndex });

    const context: IngredientContext = { currentIndex, ingredient, initialInput, recipe };
    const { error, result } = await errorHandler.attemptAsync(() => definition.run(new InputType(currentData), ingredient.spices, context));

    if (error) {
      return { hasError: true, nextData: `Error: ${error.message}`, status: 'error' };
    }
    if (result === null) {
      logger.info(`Ingredient '${definition.name}' was skipped (returned null).`);
      return { hasError: false, nextData: currentData, status: 'warning' };
    }

    const output = isPanelControlSignal(result) ? result.output : result;
    const panelInstruction = isPanelControlSignal(result) ? result.panelControl : undefined;
    errorHandler.assert(output instanceof InputType, `Ingredient '${definition.name}' returned an invalid result type.`);

    const nextData = output.cast('string').getValue();
    let inputPanelIngId: string | null = null;
    if (panelInstruction?.panelType === 'input' && panelInstruction.config.mode === 'spiceEditor') {
      inputPanelIngId = panelInstruction.config.targetIngredientId;
    }

    return { hasError: false, inputPanelIngId, nextData, panelInstruction, status: 'success' };
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
      logger.error('Error during automatic cook execution:', error);
    });
  }
}
