import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FAVORITES } from '../app/constants';
import { errorHandler, ingredientRegistry, storage } from '../app/container';
import { AppError } from '../core/ErrorHandler';
import { filterExistingIngredients } from '../helpers/ingredientHelper';
import { isArrayEqual, isString } from '../utilities/objectUtil';
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
          if (Array.isArray(stored.favorites)) {
            favorites = stored.favorites.filter((item): item is string => isString(item) && !!ingredientRegistry.get(item));
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
    const existingIds = filterExistingIngredients([...favorites].map((id) => ({ ingredientId: id }))).map((i) => i.ingredientId);

    if (existingIds.length < favorites.size) {
      setFavorites(existingIds);
    }
  },
);

persistStore(useFavoriteStore, {
  key: STORAGE_FAVORITES,
  context: 'Favorite Ingredients',
  pick: (state) => ({ favorites: [...state.favorites] }),
  equalityFn: (a, b) => isArrayEqual(a.favorites as any, b.favorites as any),
});
