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
  cookedData: InputType;
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
  readonly nextData: InputType;
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
    const handleKitchenChange = (state: KitchenState): void => {
      if (!state.isAutoCookEnabled) {
        return;
      }

      if (state.isBatchingUpdates) {
        return;
      }

      this.cook();
    };

    const handleRecipeChange = (): void => {
      if (!useKitchenStore.getState().isAutoCookEnabled) {
        return;
      }

      this.cook();
    };

    const unsubscribeKitchen = useKitchenStore.subscribe(
      (state) => state.inputData,
      () => handleKitchenChange(useKitchenStore.getState()),
    );

    const unsubscribeRecipe = useRecipeStore.subscribe((state) => [state.ingredients, state.pausedIngredientIds] as const, handleRecipeChange, {
      equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1],
    });

    const unsubscribeBatch = useKitchenStore.subscribe(
      (state) => state.isBatchingUpdates,
      (isBatching) => {
        if (isBatching) {
          return;
        }

        if (!useKitchenStore.getState().isAutoCookEnabled) {
          return;
        }

        this.cook();
      },
    );

    return () => {
      unsubscribeKitchen();
      unsubscribeRecipe();
      unsubscribeBatch();
    };
  }

  public async cook(): Promise<void> {
    const kitchenState = useKitchenStore.getState();
    if (kitchenState.isBatchingUpdates) {
      return;
    }
    if (this.isCooking) {
      logger.info('Cook request queued; another cook is in progress.');
      this.hasPendingCook = true;
      return;
    }

    const recipe = useRecipeStore.getState().ingredients;
    const inputData = kitchenState.inputData;

    if (recipe.length === 0) {
      kitchenState.setCookingResult({
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
      this.clearScheduledCook();

      const result = await this.cookRecipe(recipe, inputData);
      kitchenState.setCookingResult(result);

      const hasIntervalSetter = recipe.some((ing) => ing.name === KEY_REPEAT_STEP);
      if (!hasIntervalSetter && this.intervalMs > 0) {
        this.setCookingInterval(0);
      }

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
    if (newMs === this.intervalMs) {
      return;
    }

    this.intervalMs = newMs;
    logger.info(`Cooking interval set to ${this.intervalMs}ms.`);

    if (!this.isCooking) {
      this.scheduleNextCook();
    }
  }

  public toggleAutoCook(): void {
    const kitchenStore = useKitchenStore.getState();
    const wasEnabled = kitchenStore.isAutoCookEnabled;
    kitchenStore.toggleAutoCookState();

    if (wasEnabled) {
      this.clearScheduledCook('Auto-cook disabled, pending scheduled cook cancelled.');
      this.hasPendingCook = false;
      return;
    }

    this.cook();
  }

  public async executeSubRecipe(recipe: ReadonlyArray<IngredientItem>, initialInput: string, context?: Partial<IngredientContext>): Promise<string> {
    const state = this.createInitialLoopState(initialInput);

    for (const [index, ingredient] of recipe.entries()) {
      const definition = ingredientRegistry.get(ingredient.ingredientId);
      errorHandler.assert(definition, `Definition for '${ingredient.name}' not found during sub-recipe execution.`);

      const res = await this.runIngredient(ingredient, definition, state.cookedData, recipe, index, initialInput, {
        currentIndex: index,
        ingredient,
        initialInput,
        recipe,
        ...context,
      });

      if (res.status === 'error') {
        throw new AppError(res.nextData.cast('string').value, 'Sub-recipe Execution');
      }

      this.updateLoopStateFromResult(state, res, ingredient.id);
    }
    return state.cookedData.cast('string').value;
  }

  private async cookRecipe(recipe: ReadonlyArray<IngredientItem>, initialInput: string): Promise<RecipeCookResult> {
    const loop = await this.executeRecipeLoop(recipe, initialInput);

    let status: CookingStatusType = 'success';
    if (loop.globalError) {
      status = 'error';
    } else if (loop.hasWarnings) {
      status = 'warning';
    }

    logger.info(`Cook finished with status: ${status}.`);
    return {
      cookingStatus: status,
      ingredientStatuses: loop.localStatuses,
      ingredientWarnings: loop.localWarnings,
      inputPanelConfig: loop.lastInputConfig,
      inputPanelId: loop.lastInputPanelId,
      outputData: loop.cookedData.cast('string').value,
      outputPanelConfig: loop.lastOutputConfig,
    };
  }

  private updateLoopStateFromResult(state: RecipeLoopState, res: IngredientRunResult, id: string): void {
    const { nextData, status, warningMessage, panelInstruction, inputPanelId, hasError } = res;

    state.cookedData = nextData;
    state.localStatuses[id] = status;

    if (warningMessage) {
      state.localWarnings[id] = warningMessage;
    }

    if (hasError) {
      state.globalError = true;
    }

    if (status === 'warning') {
      state.hasWarnings = true;
    }

    if (!panelInstruction) {
      return;
    }

    if (panelInstruction.panelType === 'output') {
      state.lastOutputConfig = panelInstruction.config;
      return;
    }

    if (panelInstruction.panelType === 'input') {
      state.lastInputConfig = panelInstruction.config;
      state.lastInputPanelId = inputPanelId ?? null;
    }
  }

  private createInitialLoopState(init: string): RecipeLoopState {
    return {
      cookedData: new InputType(init),
      globalError: false,
      hasWarnings: false,
      lastInputConfig: null,
      lastInputPanelId: null,
      lastOutputConfig: null,
      localStatuses: {},
      localWarnings: {},
    };
  }

  private async executeRecipeLoop(recipe: ReadonlyArray<IngredientItem>, init: string): Promise<RecipeLoopState> {
    const state = this.createInitialLoopState(init);
    const pausedIds = useRecipeStore.getState().pausedIngredientIds;
    const len = recipe.length;

    for (let i = 0; i < len; i++) {
      const ing = recipe[i];
      if (pausedIds.has(ing.id)) {
        state.localStatuses[ing.id] = 'idle';
        continue;
      }

      const def = ingredientRegistry.get(ing.ingredientId);
      if (!def) {
        const msg = `Ingredient '${ing.name}' is misconfigured.`;
        state.cookedData = new InputType(`Error: ${msg}`);
        state.localStatuses[ing.id] = 'error';
        state.globalError = true;
        break;
      }

      const res = await this.runIngredient(ing, def, state.cookedData, recipe, i, init);
      this.updateLoopStateFromResult(state, res, ing.id);

      if (state.globalError) {
        break;
      }
    }
    return state;
  }

  private async runIngredient(
    ing: IngredientItem,
    def: IngredientDefinition,
    data: InputType,
    recipe: ReadonlyArray<IngredientItem>,
    idx: number,
    init: string,
    providedCtx?: IngredientContext,
  ): Promise<IngredientRunResult> {
    const ctx = providedCtx ?? { currentIndex: idx, ingredient: ing, initialInput: init, recipe };
    try {
      const result = await def.run(data, ing.spices, ctx);

      if (!(result instanceof InputType)) {
        throw new Error(`Ingredient '${def.name}' returned an invalid result type.`);
      }

      if (result.warningMessage !== undefined) {
        return {
          hasError: false,
          nextData: data,
          status: 'warning',
          warningMessage: result.warningMessage,
        };
      }

      const panel = result.panelControl;
      const isSpiceEditor = panel?.panelType === 'input' && panel.config.mode === 'spiceEditor';

      let inputId: string | null = null;
      if (isSpiceEditor && panel?.panelType === 'input' && panel.config.mode === 'spiceEditor') {
        inputId = panel.config.targetIngredientId;
      }

      return {
        hasError: false,
        status: 'success',
        nextData: result,
        panelInstruction: panel,
        inputPanelId: inputId,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { hasError: true, nextData: new InputType(`Error: ${msg}`), status: 'error' };
    }
  }

  private clearScheduledCook(logMessage?: string): void {
    if (!this.timeoutId) return;

    clearTimeout(this.timeoutId);
    this.timeoutId = null;

    if (logMessage) {
      logger.info(logMessage);
    }
  }

  private scheduleNextCook(): void {
    this.clearScheduledCook();

    if (this.intervalMs <= 0) return;
    if (!useKitchenStore.getState().isAutoCookEnabled) return;

    this.timeoutId = window.setTimeout(() => this.cook(), this.intervalMs);

    logger.info(`Next cook scheduled in ${this.intervalMs}ms.`);
  }
}
