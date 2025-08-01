import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { errorHandler, ingredientRegistry, storage } from '../app/container';
import { AppError } from '../core/ErrorHandler';

interface FavoriteState {
  readonly favorites: ReadonlySet<string>;
  readonly init: () => void;
  readonly setFavorites: (favorites: ReadonlySet<string>) => void;
  readonly toggle: (type: string) => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector((set, get) => ({
    favorites: new Set(),

    init: () => {
      const parsedFavorites = storage.get<Array<unknown>>(STORAGE_FAVORITES, 'Favorite Ingredients');
      let favorites: Array<string> = [];

      if (parsedFavorites) {
        if (Array.isArray(parsedFavorites)) {
          favorites = parsedFavorites.reduce<Array<string>>((acc, item) => {
            if (typeof item === 'string' && ingredientRegistry.get(item)) {
              acc.push(item);
            }
            return acc;
          }, []);
        } else {
          errorHandler.handle(
            new AppError('Corrupted favorites data in storage.', 'Favorites Storage', 'Your favorites data were corrupted and have been reset.'),
          );
        }
      }

      set({
        favorites: new Set(favorites),
      });
    },

    setFavorites: (favorites) => {
      set({
        favorites: favorites,
      });
    },

    toggle: (type) => {
      const { favorites } = get();
      const newFavorites = new Set(favorites);

      if (newFavorites.has(type)) {
        newFavorites.delete(type);
      } else {
        newFavorites.add(type);
      }

      set({
        favorites: newFavorites,
      });
    },
  })),
);

useFavoriteStore.subscribe(
  (state) => state.favorites,
  (favorites) => {
    storage.set(STORAGE_FAVORITES, [...favorites], 'Favorite Ingredients');
  },
);
