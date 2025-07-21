import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { InputPanelConfig, OutputPanelConfig } from '../core/IngredientRegistry';
import type { CookingStatusType, RecipeCookResult } from '../core/Kitchen';

interface KitchenState {
  readonly cookingStatus: CookingStatusType;
  readonly ingredientStatuses: Readonly<Record<string, CookingStatusType>>;
  readonly inputData: string;
  readonly inputPanelConfig: InputPanelConfig | null;
  readonly inputPanelIngId: string | null;
  readonly isAutoCookEnabled: boolean;
  readonly outputData: string;
  readonly outputPanelConfig: OutputPanelConfig | null;
  readonly setCookingResult: (result: Readonly<RecipeCookResult>) => void;
  readonly setInputData: (data: string) => void;
  readonly toggleAutoCookState: () => void;
}

export const useKitchenStore = create<KitchenState>()(
  subscribeWithSelector((set) => ({
    cookingStatus: 'idle',
    ingredientStatuses: {},
    inputData: '',
    inputPanelConfig: null,
    inputPanelIngId: null,
    isAutoCookEnabled: true,
    outputData: '',
    outputPanelConfig: null,
    setCookingResult: (result) => {
      set({
        cookingStatus: result.cookingStatus,
        ingredientStatuses: result.ingredientStatuses,
        inputPanelConfig: result.inputPanelConfig,
        inputPanelIngId: result.inputPanelIngId,
        outputData: result.outputData,
        outputPanelConfig: result.outputPanelConfig,
      });
    },
    setInputData: (data) => {
      set({ inputData: data });
    },
    toggleAutoCookState: () => {
      set((state) => ({ isAutoCookEnabled: !state.isAutoCookEnabled }));
    },
  })),
);
