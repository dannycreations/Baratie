import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { errorHandler, ingredientRegistry, storage } from '../app/container';
import { AppError } from '../core/ErrorHandler';
import { isArrayEqual } from '../utilities/objectUtil';
import { createSetHandlers, persistStore } from '../utilities/storeUtil';
import { useIngredientStore } from './useIngredientStore';

interface FavoriteState {
  readonly favorites: ReadonlySet<string>;
  readonly init: () => void;
  readonly setFavorites: (favorites: ReadonlySet<string> | ReadonlyArray<string>) => void;
  readonly toggle: (type: string) => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  subscribeWithSelector((set) => {
    const handlers = createSetHandlers<FavoriteState, 'favorites', string>(set, 'favorites');

    return {
      favorites: new Set(),

      init: () => {
        const stored = storage.get<{ favorites: Array<unknown> }>(STORAGE_FAVORITES, 'Favorite Ingredients');
        let favorites: Array<string> = [];

        if (stored) {
          if (stored.favorites && Array.isArray(stored.favorites)) {
            favorites = stored.favorites.reduce<Array<string>>((acc, item) => {
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

        handlers.set(favorites);
      },

      setFavorites: handlers.set,

      toggle: handlers.toggle,
    };
  }),
);

useIngredientStore.subscribe(
  (state) => state.registryVersion,
  () => {
    const { favorites, setFavorites } = useFavoriteStore.getState();
    const newFavorites = new Set<string>();
    let changed = false;
    for (const fav of favorites) {
      if (ingredientRegistry.get(fav)) {
        newFavorites.add(fav);
      } else {
        changed = true;
      }
    }
    if (changed) {
      setFavorites(newFavorites);
    }
  },
);

persistStore(useFavoriteStore, {
  key: STORAGE_FAVORITES,
  context: 'Favorite Ingredients',
  pick: (state) => ({ favorites: [...state.favorites] }),
  equalityFn: (a, b) => isArrayEqual(a.favorites as any, b.favorites as any),
});
