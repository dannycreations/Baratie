import { beforeEach, describe, expect, it, vi } from 'bun:test';

import { STORAGE_COOKBOOK, STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, taskRegistry } from '../app/container';
import { useCookbookStore } from '../stores/useCookbookStore';
import { useTaskStore } from '../stores/useTaskStore';

import type { IngredientDefinition } from '../core/IngredientRegistry';

const EXTENSION_ID = 'test/test@latest';
const EXTENSION_ENTRY = 'index.js';
const INGREDIENT_NAME = 'Cached Extension Ingredient';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

Object.defineProperty(globalThis, 'window', {
  value: {
    setTimeout: (fn: TimerHandler, delay: number) => globalThis.setTimeout(fn, delay),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    document: { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} },
    Baratie: { ingredient: { register: () => '' } },
  },
  writable: true,
});

const extensionDefinition: IngredientDefinition = {
  name: INGREDIENT_NAME,
  category: 'Test',
  description: 'Registered when the cached extension script runs.',
  run: (input) => input,
};

// The registry derives ids from a hash of the definition, so the id a stored
// recipe points at can be resolved without loading the extension first.
const getExtensionIngredientId = (): string => {
  const id = ingredientRegistry.register(extensionDefinition, EXTENSION_ID);
  ingredientRegistry.unregister([id]);
  return id;
};

const seedCachedExtension = (): void => {
  const { run: _run, ...serializableDefinition } = extensionDefinition;

  localStorageMock.setItem(
    STORAGE_EXTENSIONS,
    JSON.stringify([
      {
        id: EXTENSION_ID,
        name: 'Test Extension',
        entry: EXTENSION_ENTRY,
        fetchedAt: Date.now(),
        scripts: { [EXTENSION_ENTRY]: `Baratie.ingredient.register(${JSON.stringify(serializableDefinition)}, '${EXTENSION_ID}');` },
      },
    ]),
  );
};

const seedCookbookRecipe = (ingredientId: string): void => {
  const now = Date.now();

  localStorageMock.setItem(
    STORAGE_COOKBOOK,
    JSON.stringify([
      {
        id: 'recipe-1',
        name: 'Extension Recipe',
        ingredients: [{ id: 'step-1', ingredientId, name: INGREDIENT_NAME, spices: {} }],
        createdAt: now,
        updatedAt: now,
      },
    ]),
  );
};

describe('cookbook hydration during application init', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useTaskStore.setState({ isInitialized: false });
    useCookbookStore.setState({ nameInput: '', recipes: [], recipeIdMap: new Map() });
  });

  it('keeps stored steps whose ingredients come from a cached extension', async () => {
    seedCookbookRecipe(getExtensionIngredientId());
    seedCachedExtension();

    await taskRegistry.init();

    const recipes = useCookbookStore.getState().recipes;
    expect(recipes).toHaveLength(1);
    expect(recipes[0].ingredients).toHaveLength(1);
  });
});
