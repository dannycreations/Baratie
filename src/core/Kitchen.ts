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
} from './IngredientRegistry';

export type CookingStatusType = 'idle' | 'error' | 'success' | 'warning';

export type RecipeCookResult = Pick<
  KitchenState,
  'cookingStatus' | 'ingredientStatuses' | 'ingredientWarnings' | 'inputPanelConfig' | 'inputPanelId' | 'outputData' | 'outputPanelConfig'
>;

interface RecipeLoopState {
  cookedData: string;
  globalError: boolean;
  hasWarnings: boolean;
  lastInputConfig: InputPanelConfig | null;
  lastInputPanelId: string | null;
  lastOutputConfig: OutputPanelConfig | null;
  localStatuses: Record<string, CookingStatusType>;
  localWarnings: Record<string, string | null>;
}

interface IngredientRunResult {
  readonly hasError: boolean;
  readonly nextData: string;
  readonly status: CookingStatusType;
  readonly inputPanelId?: string | null;
  readonly panelInstruction?: PanelControlConfig;
  readonly warningMessage?: string | null;
}

export class Kitchen {
  private isCooking = false;
  private hasPendingCook = false;
  private timeoutId: number | null = null;
  private intervalMs = 0;

  public initAutoCook(): () => void {
    const handleStateChange = (): void => {
      if (useKitchenStore.getState().isAutoCookEnabled) {
        this.cook();
      }
    };

    const unsubscribeKitchen = useKitchenStore.subscribe(
      (state) => ({ inputData: state.inputData, isBatchingUpdates: state.isBatchingUpdates }),
      handleStateChange,
      {
        equalityFn: (a, b) => a.inputData === b.inputData && a.isBatchingUpdates === b.isBatchingUpdates,
      },
    );

    const unsubscribeRecipe = useRecipeStore.subscribe(
      (state) => ({ ingredients: state.ingredients, pausedIds: state.pausedIngredientIds }),
      handleStateChange,
      { equalityFn: (a, b) => a.ingredients === b.ingredients && a.pausedIds === b.pausedIds },
    );

    return () => {
      unsubscribeKitchen();
      unsubscribeRecipe();
    };
  }

  public async cook(): Promise<void> {
    if (useKitchenStore.getState().isBatchingUpdates) {
      return;
    }
    if (this.isCooking) {
      logger.info('Cook request queued; another cook is in progress.');
      this.hasPendingCook = true;
      return;
    }

    const recipe = useRecipeStore.getState().ingredients;
    const inputData = useKitchenStore.getState().inputData;
    if (recipe.length === 0) {
      useKitchenStore.getState().setCookingResult({
        cookingStatus: inputData ? 'success' : 'idle',
        ingredientStatuses: {},
        ingredientWarnings: {},
        inputPanelConfig: null,
        inputPanelId: null,
        outputData: inputData,
        outputPanelConfig: null,
      });
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

      const hasIntervalSetter = recipe.some((ing) => ing.name === KEY_REPEAT_STEP);

      if (!hasIntervalSetter && this.intervalMs > 0) {
        this.setCookingInterval(0);
      }

      const result = await this.cookRecipe(recipe, inputData);
      useKitchenStore.getState().setCookingResult(result);
      this.scheduleNextCook();
    } catch (error) {
      this.scheduleNextCook();
      logger.error('Error during automatic cook execution:', error);
    } finally {
      this.isCooking = false;
      if (this.hasPendingCook) {
        this.cook();
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

  public toggleAutoCook(): void {
    const wasEnabled = useKitchenStore.getState().isAutoCookEnabled;
    useKitchenStore.getState().toggleAutoCookState();

    if (!wasEnabled) {
      this.cook();
    } else {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
        logger.info('Auto-cook disabled, pending scheduled cook cancelled.');
      }
      this.hasPendingCook = false;
    }
  }

  private async cookRecipe(recipe: ReadonlyArray<IngredientItem>, initialInput: string): Promise<RecipeCookResult> {
    const loopResult = await this.executeRecipeLoop(recipe, initialInput);

    let finalStatus: CookingStatusType = 'success';
    if (loopResult.globalError) {
      finalStatus = 'error';
    } else if (loopResult.hasWarnings) {
      finalStatus = 'warning';
    }

    logger.info(`Cook finished with status: ${finalStatus}.`);

    return {
      cookingStatus: finalStatus,
      ingredientStatuses: loopResult.localStatuses,
      ingredientWarnings: loopResult.localWarnings,
      inputPanelConfig: loopResult.lastInputConfig,
      inputPanelId: loopResult.lastInputPanelId,
      outputData: loopResult.cookedData,
      outputPanelConfig: loopResult.lastOutputConfig,
    };
  }

  private updateLoopStateFromResult(state: RecipeLoopState, result: IngredientRunResult, ingredientId: string): void {
    state.cookedData = result.nextData;
    state.localStatuses[ingredientId] = result.status;

    if (result.warningMessage) {
      state.localWarnings[ingredientId] = result.warningMessage;
    }

    if (result.panelInstruction) {
      if (result.panelInstruction.panelType === 'input') {
        state.lastInputConfig = result.panelInstruction.config;
        state.lastInputPanelId = result.inputPanelId ?? null;
      } else {
        state.lastOutputConfig = result.panelInstruction.config;
      }
    }

    if (result.hasError) {
      state.globalError = true;
    }
    if (result.status === 'warning') {
      state.hasWarnings = true;
    }
  }

  private async processSingleIngredient(
    ingredient: IngredientItem,
    index: number,
    recipe: ReadonlyArray<IngredientItem>,
    initialInput: string,
    loopState: RecipeLoopState,
  ): Promise<boolean> {
    const { pausedIngredientIds } = useRecipeStore.getState();

    if (pausedIngredientIds.has(ingredient.id)) {
      logger.info(`Skipping paused ingredient: ${ingredient.name}`);
      loopState.localStatuses[ingredient.id] = 'idle';
      loopState.localWarnings[ingredient.id] = null;
      return false;
    }

    const definition = ingredientRegistry.get(ingredient.ingredientId);

    if (!definition) {
      const errorMessage = `Ingredient '${ingredient.name}' is misconfigured or from a removed extension.`;
      errorHandler.handle(
        new AppError(`Definition for ID '${ingredient.ingredientId}' (${ingredient.name}) not found.`, 'Recipe Cooking', errorMessage),
      );
      loopState.cookedData = `Error: ${errorMessage}`;
      loopState.localStatuses[ingredient.id] = 'error';
      loopState.globalError = true;
      return true;
    }

    const result = await this.runIngredient(ingredient, definition, loopState.cookedData, recipe, index, initialInput);
    this.updateLoopStateFromResult(loopState, result, ingredient.id);

    return loopState.globalError;
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
      localWarnings: {},
    };

    for (const [index, ingredient] of recipe.entries()) {
      const shouldBreak = await this.processSingleIngredient(ingredient, index, recipe, initialInput, state);
      if (shouldBreak) {
        break;
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

    errorHandler.assert(result instanceof InputType, `Ingredient '${definition.name}' returned an invalid result type.`);

    if (result.warningMessage !== undefined) {
      const message = result.warningMessage ? `: ${result.warningMessage}` : '.';
      logger.info(`Ingredient '${definition.name}' was skipped with a warning${message}`);
      return {
        hasError: false,
        nextData: currentData,
        status: 'warning',
        warningMessage: result.warningMessage,
      };
    }

    const panelInstruction = result.panelControl;
    let inputPanelId: string | null = null;
    if (panelInstruction?.panelType === 'input' && panelInstruction.config.mode === 'spiceEditor') {
      inputPanelId = panelInstruction.config.targetIngredientId;
    }

    return {
      hasError: false,
      status: 'success',
      nextData: result.cast('string').value,
      panelInstruction,
      inputPanelId,
    };
  }

  private scheduleNextCook(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.intervalMs > 0 && useKitchenStore.getState().isAutoCookEnabled) {
      this.timeoutId = window.setTimeout(() => {
        this.cook();
      }, this.intervalMs);
      logger.info(`Next cook scheduled in ${this.intervalMs}ms.`);
    }
  }
}
