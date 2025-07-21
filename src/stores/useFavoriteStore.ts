import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface FavoriteState {
  readonly favorites: ReadonlySet<symbol>;
  readonly setFavorites: (favorites: ReadonlySet<symbol>) => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector((set) => ({
    favorites: new Set(),

    setFavorites(favorites) {
      set({ favorites });
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
