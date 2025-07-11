import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface FavoriteState {
  readonly favorites: readonly symbol[];
  readonly setFavorites: (favorites: readonly symbol[]) => void;
  readonly toggle: (type: symbol) => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector((set) => ({
    favorites: [],

    setFavorites(favorites) {
      set({ favorites });
    },

    toggle(type) {
      set((state) => ({
        favorites: state.favorites.includes(type) ? state.favorites.filter((favorite) => favorite !== type) : [...state.favorites, type],
      }));
    },
  })),
);

useFavoriteStore.subscribe(
  (state) => state.favorites,
  (favorites) => {
    const favStrings = favorites.map((favorite) => ingredientRegistry.getStringFromSymbol(favorite)).filter((str) => str != null);
    storage.set(STORAGE_FAVORITES, favStrings, 'Favorite Ingredients');
  },
);
