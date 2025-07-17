import { create } from 'zustand';

import type { RecipeBookItem } from '../core/IngredientRegistry';

interface OpenModalArgs {
  readonly mode: 'load' | 'save';
  readonly name: string;
}

interface CookbookState {
  readonly closeModal: () => void;
  readonly isModalOpen: boolean;
  readonly modalMode: 'load' | 'save' | null;
  readonly nameInput: string;
  readonly openModal: (args: Readonly<OpenModalArgs>) => void;
  readonly query: string;
  readonly recipes: readonly RecipeBookItem[];
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
}

export const useCookbookStore = create<CookbookState>()((set) => ({
  isModalOpen: false,
  modalMode: null,
  nameInput: '',
  query: '',
  recipes: [],

  closeModal() {
    set({ isModalOpen: false });
  },

  openModal(args) {
    set({
      isModalOpen: true,
      modalMode: args.mode,
      nameInput: args.name,
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
