import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface FavoriteState {
  readonly favorites: ReadonlySet<symbol>;
  readonly setFavorites: (favorites: ReadonlySet<symbol>) => void;
  readonly toggle: (type: symbol) => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector((set, get) => ({
    favorites: new Set(),

    setFavorites(favorites) {
      set({ favorites });
    },

    toggle(type) {
      const { favorites } = get();
      const newFavorites = new Set(favorites);
      if (newFavorites.has(type)) {
        newFavorites.delete(type);
      } else {
        newFavorites.add(type);
      }
      set({ favorites: newFavorites });
    },
  })),
);

useFavoriteStore.subscribe(
  (state) => state.favorites,
  (favorites) => {
    const favStrings = Array.from(favorites)
      .map((favorite) => ingredientRegistry.getStringFromSymbol(favorite))
      .filter((str): str is string => !!str);
    storage.set(STORAGE_FAVORITES, favStrings, 'Favorite Ingredients');
  },
);
