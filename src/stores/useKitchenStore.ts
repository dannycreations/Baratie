import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { InputPanelConfig, OutputPanelConfig } from '../core/IngredientRegistry';
import type { CookingStatusType, RecipeCookResult } from '../core/Kitchen';

interface KitchenState {
  readonly inputPanelConfig: InputPanelConfig | null;
  readonly outputPanelConfig: OutputPanelConfig | null;
  readonly cookingStatus: CookingStatusType;
  readonly ingredientStatuses: Readonly<Record<string, CookingStatusType>>;
  readonly inputData: string;
  readonly inputPanelIngId: string | null;
  readonly isAutoCookEnabled: boolean;
  readonly outputData: string;
  readonly setCookingResult: (result: RecipeCookResult) => void;
  readonly setInputData: (data: string) => void;
  readonly toggleAutoCookState: () => void;
}

export const useKitchenStore = create<KitchenState>()(
  subscribeWithSelector(function (set) {
    return {
      inputPanelConfig: null,
      outputPanelConfig: null,
      cookingStatus: 'idle',
      ingredientStatuses: {},
      inputData: '',
      inputPanelIngId: null,
      isAutoCookEnabled: true,
      outputData: '',

      setCookingResult(result: RecipeCookResult): void {
        set({
          inputPanelConfig: result.inputPanelConfig,
          outputPanelConfig: result.outputPanelConfig,
          cookingStatus: result.cookingStatus,
          ingredientStatuses: result.ingredientStatuses,
          inputPanelIngId: result.inputPanelIngId,
          outputData: result.outputData,
        });
      },
      setInputData(data: string): void {
        set({ inputData: data });
      },
      toggleAutoCookState(): void {
        set((state) => ({ isAutoCookEnabled: !state.isAutoCookEnabled }));
      },
    };
  }),
);
