import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface FavoriteState {
  readonly favorites: readonly symbol[];
  readonly setFavorites: (favorites: readonly symbol[]) => void;
  readonly toggle: (type: symbol) => void;
}

function selectFavorites(state: FavoriteState): readonly symbol[] {
  return state.favorites;
}

function saveFavoritesToStorage(favorites: readonly symbol[]): void {
  const favStrings = favorites.map((favorite) => ingredientRegistry.getStringFromSymbol(favorite)).filter((str): str is string => str != null);
  storage.set(STORAGE_FAVORITES, favStrings, 'Favorite Ingredients');
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector(function (set) {
    return {
      favorites: [],

      setFavorites(favorites) {
        set({ favorites });
      },
      toggle(type) {
        set((state) => ({
          favorites: state.favorites.includes(type) ? state.favorites.filter((favorite) => favorite !== type) : [...state.favorites, type],
        }));
      },
    };
  }),
);

useFavoriteStore.subscribe(selectFavorites, saveFavoritesToStorage);
