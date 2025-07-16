import { create } from 'zustand';

import type { RecipeBookItem } from '../core/IngredientRegistry';

type OpenModalArgs = {
  readonly mode: 'load' | 'save';
  readonly name: string;
};

interface CookbookState {
  readonly isModalOpen: boolean;
  readonly nameInput: string;
  readonly modalMode: 'load' | 'save' | null;
  readonly query: string;
  readonly recipes: readonly RecipeBookItem[];
  readonly closeModal: () => void;
  readonly openModal: (args: OpenModalArgs) => void;
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
}

export const useCookbookStore = create<CookbookState>()((set) => ({
  isModalOpen: false,
  nameInput: '',
  modalMode: null,
  query: '',
  recipes: [],

  closeModal() {
    set({ isModalOpen: false });
  },

  openModal(args) {
    set({
      isModalOpen: true,
      nameInput: args.name,
      modalMode: args.mode,
      query: '',
    });
  },

  resetModal() {
    set({ nameInput: '', modalMode: null, query: '' });
  },

  setName(name) {
    set({ nameInput: name });
  },

  setQuery(term) {
    set({ query: term });
  },

  setRecipes(recipes) {
    set({ recipes: [...recipes].sort((a, b) => b.updatedAt - a.updatedAt) });
  },
}));
