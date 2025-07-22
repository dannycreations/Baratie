import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { errorHandler, ingredientRegistry, storage } from '../app/container';
import { AppError } from '../core/ErrorHandler';

interface FavoriteState {
  readonly favorites: ReadonlySet<symbol>;
  readonly init: () => void;
  readonly setFavorites: (favorites: ReadonlySet<symbol>) => void;
  readonly toggle: (type: symbol) => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector((set, get) => ({
    favorites: new Set(),

    init: () => {
      const parsedFavorites = storage.get(STORAGE_FAVORITES, 'Favorite Ingredients');
      let favorites: Array<symbol> = [];
      if (parsedFavorites) {
        if (Array.isArray(parsedFavorites)) {
          favorites = parsedFavorites.reduce<Array<symbol>>((acc, item) => {
            if (typeof item === 'string') {
              const symbol = ingredientRegistry.getSymbolFromString(item);
              if (symbol) {
                acc.push(symbol);
              }
            }
            return acc;
          }, []);
        } else {
          errorHandler.handle(
            new AppError('Corrupted favorites data in storage.', 'Favorites Storage', 'Your favorites data were corrupted and have been reset.'),
          );
        }
      }

      set({ favorites: new Set(favorites) });
    },

    setFavorites: (favorites) => {
      set({ favorites });
    },

    toggle: (type) => {
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
