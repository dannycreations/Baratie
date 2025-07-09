import { STORAGE_FAVORITES } from '../app/constants';
import { errorHandler, ingredientRegistry, storage } from '../app/container';
import { AppError } from '../core/ErrorHandler';
import { useFavoriteStore } from '../stores/useFavoriteStore';

export function initFavorites(): void {
  const parsedFavorites = storage.get(STORAGE_FAVORITES, 'Favorite Ingredients');
  let favorites: symbol[] = [];
  if (parsedFavorites) {
    if (Array.isArray(parsedFavorites)) {
      favorites = parsedFavorites
        .map((item) => (typeof item === 'string' ? ingredientRegistry.getSymbolFromString(item) : undefined))
        .filter((s): s is symbol => s !== undefined);
    } else {
      errorHandler.handle(
        new AppError(
          'Corrupted favorites data (not an array) found in localStorage.',
          'Favorites Storage',
          'Your favorites data were corrupted and have been reset.',
        ),
      );
    }
  }
  useFavoriteStore.getState().setFavorites(favorites);
}

export function toggleFavorite(type: symbol): void {
  useFavoriteStore.getState().toggle(type);
}
