import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { InputPanelConfig, OutputPanelConfig } from '../core/IngredientRegistry';
import type { CookingStatusType, RecipeCookResult } from '../core/Kitchen';

export interface KitchenState {
  readonly cookingStatus: CookingStatusType;
  readonly ingredientStatuses: Readonly<Record<string, CookingStatusType>>;
  readonly ingredientWarnings: Readonly<Record<string, string | null>>;
  readonly inputData: string;
  readonly inputPanelConfig: InputPanelConfig | null;
  readonly inputPanelId: string | null;
  readonly isAutoCookEnabled: boolean;
  readonly isBatchingUpdates: boolean;
  readonly outputData: string;
  readonly outputPanelConfig: OutputPanelConfig | null;
  readonly setCookingResult: (result: Readonly<RecipeCookResult>) => void;
  readonly setInputData: (data: string) => void;
  readonly startUpdateBatch: () => void;
  readonly endUpdateBatch: () => void;
  readonly toggleAutoCookState: () => void;
}

export const useKitchenStore = create<KitchenState>()(
  subscribeWithSelector((set) => {
    return {
      cookingStatus: 'idle',
      ingredientStatuses: {},
      ingredientWarnings: {},
      inputData: '',
      inputPanelConfig: null,
      inputPanelId: null,
      isAutoCookEnabled: true,
      isBatchingUpdates: false,
      outputData: '',
      outputPanelConfig: null,

      setCookingResult: (result) => {
        set(result);
      },

      setInputData: (inputData) => {
        set({ inputData });
      },

      startUpdateBatch: () => {
        set({ isBatchingUpdates: true });
      },

      endUpdateBatch: () => {
        set({ isBatchingUpdates: false });
      },

      toggleAutoCookState: () => {
        set((state) => ({ isAutoCookEnabled: !state.isAutoCookEnabled }));
      },
    };
  }),
);
