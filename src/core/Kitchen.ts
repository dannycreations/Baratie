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

    const unsubscribeKitchen = useKitchenStore.subscribe((state) => [state.inputData, state.isBatchingUpdates] as const, handleStateChange, {
      equalityFn: ([d1, b1], [d2, b2]) => d1 === d2 && b1 === b2,
    });

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

  public async executeSubRecipe(recipe: ReadonlyArray<IngredientItem>, initialInput: string, context?: Partial<IngredientContext>): Promise<string> {
    let currentData = initialInput;
    for (const [index, ingredient] of recipe.entries()) {
      const definition = ingredientRegistry.get(ingredient.ingredientId);
      errorHandler.assert(definition, `Definition for '${ingredient.name}' not found during sub-recipe execution.`);
      const res = await this.runIngredient(ingredient, definition, currentData, recipe, index, initialInput, {
        currentIndex: index,
        ingredient,
        initialInput,
        recipe,
        ...context,
      });
      if (res.status === 'error') throw new AppError(res.nextData, 'Sub-recipe Execution');
      if (res.status !== 'warning') currentData = res.nextData;
    }
    return currentData;
  }

  private async cookRecipe(recipe: ReadonlyArray<IngredientItem>, initialInput: string): Promise<RecipeCookResult> {
    const loop = await this.executeRecipeLoop(recipe, initialInput);
    const status: CookingStatusType = loop.globalError ? 'error' : loop.hasWarnings ? 'warning' : 'success';
    logger.info(`Cook finished with status: ${status}.`);
    return {
      cookingStatus: status,
      ingredientStatuses: loop.localStatuses,
      ingredientWarnings: loop.localWarnings,
      inputPanelConfig: loop.lastInputConfig,
      inputPanelId: loop.lastInputPanelId,
      outputData: loop.cookedData,
      outputPanelConfig: loop.lastOutputConfig,
    };
  }

  private updateLoopStateFromResult(state: RecipeLoopState, res: IngredientRunResult, id: string): void {
    state.cookedData = res.nextData;
    state.localStatuses[id] = res.status;
    if (res.warningMessage) state.localWarnings[id] = res.warningMessage;
    if (res.panelInstruction) {
      if (res.panelInstruction.panelType === 'input') {
        state.lastInputConfig = res.panelInstruction.config;
        state.lastInputPanelId = res.inputPanelId ?? null;
      } else state.lastOutputConfig = res.panelInstruction.config;
    }
    if (res.hasError) state.globalError = true;
    if (res.status === 'warning') state.hasWarnings = true;
  }

  private async processSingleIngredient(
    ing: IngredientItem,
    idx: number,
    recipe: ReadonlyArray<IngredientItem>,
    init: string,
    state: RecipeLoopState,
  ): Promise<boolean> {
    if (useRecipeStore.getState().pausedIngredientIds.has(ing.id)) {
      logger.info(`Skipping paused ingredient: ${ing.name}`);
      state.localStatuses[ing.id] = 'idle';
      state.localWarnings[ing.id] = null;
      return false;
    }
    const def = ingredientRegistry.get(ing.ingredientId);
    if (!def) {
      const msg = `Ingredient '${ing.name}' is misconfigured or from a removed extension.`;
      errorHandler.handle(new AppError(`Definition for ID '${ing.ingredientId}' (${ing.name}) not found.`, 'Recipe Cooking', msg));
      state.cookedData = `Error: ${msg}`;
      state.localStatuses[ing.id] = 'error';
      state.globalError = true;
      return true;
    }
    const res = await this.runIngredient(ing, def, state.cookedData, recipe, idx, init);
    this.updateLoopStateFromResult(state, res, ing.id);
    return state.globalError;
  }

  private async executeRecipeLoop(recipe: ReadonlyArray<IngredientItem>, init: string): Promise<RecipeLoopState> {
    const state: RecipeLoopState = {
      cookedData: init,
      globalError: false,
      hasWarnings: false,
      lastInputConfig: null,
      lastInputPanelId: null,
      lastOutputConfig: null,
      localStatuses: {},
      localWarnings: {},
    };
    for (const [i, ing] of recipe.entries()) {
      if (await this.processSingleIngredient(ing, i, recipe, init, state)) break;
    }
    return state;
  }

  private async runIngredient(
    ing: IngredientItem,
    def: IngredientDefinition,
    data: string,
    recipe: ReadonlyArray<IngredientItem>,
    idx: number,
    init: string,
    providedCtx?: IngredientContext,
  ): Promise<IngredientRunResult> {
    errorHandler.assert(def.run, `Runner for '${def.name}' not found.`);
    logger.debug(`Running ingredient: ${def.name}`, { id: ing.id, index: idx });
    const ctx = providedCtx ?? { currentIndex: idx, ingredient: ing, initialInput: init, recipe };
    const { error, result } = await errorHandler.attemptAsync(() => def.run(new InputType(data), ing.spices, ctx));
    if (error) return { hasError: true, nextData: `Error: ${error.message}`, status: 'error' };
    errorHandler.assert(result instanceof InputType, `Ingredient '${def.name}' returned an invalid result type.`);
    if (result.warningMessage !== undefined) {
      logger.info(`Ingredient '${def.name}' was skipped with a warning${result.warningMessage ? `: ${result.warningMessage}` : '.'}`);
      return { hasError: false, nextData: data, status: 'warning', warningMessage: result.warningMessage };
    }
    const panel = result.panelControl;
    const inputId = panel?.panelType === 'input' && panel.config.mode === 'spiceEditor' ? panel.config.targetIngredientId : null;
    return { hasError: false, status: 'success', nextData: result.cast('string').value, panelInstruction: panel, inputPanelId: inputId };
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
