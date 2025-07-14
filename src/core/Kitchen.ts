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

export class Kitchen {
  private isCooking = false;
  private hasPendingCook = false;
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
      this.hasPendingCook = false;
    }
  };

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

  private async cookRecipe(recipe: readonly Ingredient[], initialInput: string): Promise<RecipeCookResult> {
    if (recipe.length === 0) {
      return {
        inputPanelConfig: null,
        outputPanelConfig: null,
        cookingStatus: initialInput ? 'success' : 'idle',
        ingredientStatuses: {},
        inputPanelIngId: null,
        outputData: initialInput,
      };
    }

    const loopResult = await this.executeRecipeLoop(recipe, initialInput);
    const finalStatus: CookingStatusType = loopResult.globalError ? 'error' : loopResult.hasWarnings ? 'warning' : 'success';
    logger.info(`Cook finished with status: ${finalStatus}.`);

    return {
      inputPanelConfig: loopResult.lastInputConfig,
      outputPanelConfig: loopResult.lastOutputConfig,
      cookingStatus: finalStatus,
      ingredientStatuses: loopResult.localStatuses,
      inputPanelIngId: loopResult.lastInputPanelId,
      outputData: loopResult.cookedData,
    };
  }

  private async executeRecipeLoop(recipe: readonly Ingredient[], initialInput: string): Promise<CookLoopResult> {
    let cookedData = initialInput;
    const localStatuses: Record<string, CookingStatusType> = {};
    let lastInputConfig: InputPanelConfig | null = null;
    let lastOutputConfig: OutputPanelConfig | null = null;
    let lastInputPanelId: string | null = null;
    let globalError = false;
    let hasWarnings = false;

    for (let index = 0; index < recipe.length; index++) {
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

  private async runIngredient(
    ingredient: Ingredient,
    definition: IngredientDefinition,
    currentData: string,
    recipe: readonly Ingredient[],
    currentIndex: number,
    initialInput: string,
  ): Promise<IngredientRunResult> {
    errorHandler.assert(definition.run, `Runner for '${ingredient.name.description}' not found.`);
    logger.debug(`Running ingredient: ${ingredient.name.description}`, { id: ingredient.id, index: currentIndex });

    const context: IngredientContext = { currentIndex, ingredient, initialInput, recipe };
    const { error, result } = await errorHandler.attemptAsync(() => definition.run(new InputType(currentData), ingredient.spices, context));

    if (error) {
      return { hasError: true, nextData: `Error: ${error.message}`, status: 'error' };
    }

    if (result === null) {
      logger.info(`Ingredient '${ingredient.name.description}' was skipped (returned null).`);
      return { hasError: false, nextData: currentData, status: 'warning' };
    }

    const isPanelControlSignal = 'output' in result;
    const output = isPanelControlSignal ? result.output : result;
    const panelInstruction = isPanelControlSignal ? result.panelControl : undefined;

    if (!(output instanceof InputType)) {
      errorHandler.assert(false, `Ingredient '${ingredient.name.description}' returned an invalid result type.`);
    }

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
