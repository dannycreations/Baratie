import { beforeEach, describe, expect, it, vi } from 'bun:test';

import { useCookbookStore } from './useCookbookStore';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const listeners: Record<string, Array<EventListener>> = {};

const mockWindow = {
  setTimeout: (fn: TimerHandler, delay: number) => globalThis.setTimeout(fn, delay),
  clearTimeout: (id: number) => globalThis.clearTimeout(id),
  addEventListener: (type: string, listener: EventListener) => {
    if (!listeners[type]) {
      listeners[type] = [];
    }
    listeners[type].push(listener);
  },
  removeEventListener: (type: string, listener: EventListener) => {
    if (listeners[type]) {
      const index = listeners[type].indexOf(listener);
      if (index !== -1) {
        listeners[type].splice(index, 1);
      }
    }
  },
  document: {
    visibilityState: 'visible',
    addEventListener: () => {},
    removeEventListener: () => {},
  },
};

Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true,
});

interface SavedRecipe {
  readonly id: string;
  readonly name: string;
  readonly ingredients: ReadonlyArray<{
    readonly id: string;
    readonly ingredientId: string;
    readonly name: string;
    readonly spices: Readonly<Record<string, unknown>>;
  }>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

describe('saving cookbook behaviour', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
    Object.keys(listeners).forEach((key) => {
      listeners[key] = [];
    });

    useCookbookStore.setState({
      nameInput: '',
      recipes: [],
      recipeIdMap: new Map(),
    });

    useRecipeStore.setState({
      activeRecipeId: null,
      editingIds: new Set(),
      ingredients: [],
      ingredientsMap: new Map(),
      pausedIngredientIds: new Set(),
    });

    useNotificationStore.setState({
      map: new Map(),
      dedupeMap: new Map(),
    });
  });

  it('saves a new recipe with a generated id and persists it to local storage', () => {
    const ingredientId = crypto.randomUUID();

    useCookbookStore.setState({ nameInput: 'Test Recipe' });
    useRecipeStore.setState({
      activeRecipeId: null,
      ingredients: [
        {
          id: ingredientId,
          ingredientId: 'ingredient-1',
          name: 'Test Ingredient',
          spices: {},
        },
      ],
      ingredientsMap: new Map([
        [
          ingredientId,
          {
            id: ingredientId,
            ingredientId: 'ingredient-1',
            name: 'Test Ingredient',
            spices: {},
          },
        ],
      ]),
      editingIds: new Set(),
      pausedIngredientIds: new Set(),
    });

    useCookbookStore.getState().upsert();

    const storedValue = localStorageMock.getItem('baratie-cookbook');
    expect(storedValue).not.toBeNull();

    const parsed = JSON.parse(storedValue!) as SavedRecipe[];
    expect(parsed).toHaveLength(1);

    const saved = parsed[0];
    expect(saved.name).toBe('Test Recipe');
    expect(saved.id.length).toBeGreaterThan(0);
    expect(saved.createdAt).toBe(saved.updatedAt);
    expect(saved.ingredients).toHaveLength(1);
    expect(saved.ingredients[0]).toEqual({
      id: ingredientId,
      ingredientId: 'ingredient-1',
      name: 'Test Ingredient',
      spices: {},
    });
  });

  it('updates an existing recipe when the name matches the active recipe', () => {
    const recipeId = crypto.randomUUID();
    const ingredientId = crypto.randomUUID();
    const createdAt = Date.now() - 1000;

    const existingRecipe = {
      id: recipeId,
      name: 'Existing Recipe',
      ingredients: [
        {
          id: ingredientId,
          ingredientId: 'ingredient-1',
          name: 'Test Ingredient',
          spices: {},
        },
      ],
      createdAt,
      updatedAt: createdAt,
    };

    useCookbookStore.setState({
      nameInput: 'Existing Recipe',
      recipes: [existingRecipe],
      recipeIdMap: new Map([[recipeId, existingRecipe]]),
    });

    useRecipeStore.setState({
      activeRecipeId: recipeId,
      ingredients: [
        {
          id: ingredientId,
          ingredientId: 'ingredient-1',
          name: 'Updated Ingredient',
          spices: { spicy: true },
        },
      ],
      ingredientsMap: new Map([
        [
          ingredientId,
          {
            id: ingredientId,
            ingredientId: 'ingredient-1',
            name: 'Updated Ingredient',
            spices: { spicy: true },
          },
        ],
      ]),
      editingIds: new Set(),
      pausedIngredientIds: new Set(),
    });

    useCookbookStore.getState().upsert();

    const storedValue = localStorageMock.getItem('baratie-cookbook');
    expect(storedValue).not.toBeNull();

    const parsed = JSON.parse(storedValue!) as SavedRecipe[];
    expect(parsed).toHaveLength(1);

    const saved = parsed[0];
    expect(saved.id).toBe(recipeId);
    expect(saved.name).toBe('Existing Recipe');
    expect(saved.createdAt).toBe(createdAt);
    expect(saved.updatedAt).toBeGreaterThan(createdAt);
    expect(saved.ingredients[0].name).toBe('Updated Ingredient');
    expect(saved.ingredients[0].spices).toEqual({ spicy: true });
  });

  it('creates a new copy when saving with a different name while an active recipe exists', () => {
    const recipeId = crypto.randomUUID();
    const ingredientId = crypto.randomUUID();
    const createdAt = Date.now() - 1000;

    const existingRecipe = {
      id: recipeId,
      name: 'Existing Recipe',
      ingredients: [
        {
          id: ingredientId,
          ingredientId: 'ingredient-1',
          name: 'Test Ingredient',
          spices: {},
        },
      ],
      createdAt,
      updatedAt: createdAt,
    };

    useCookbookStore.setState({
      nameInput: 'New Recipe Name',
      recipes: [existingRecipe],
      recipeIdMap: new Map([[recipeId, existingRecipe]]),
    });

    useRecipeStore.setState({
      activeRecipeId: recipeId,
      ingredients: [
        {
          id: ingredientId,
          ingredientId: 'ingredient-1',
          name: 'Test Ingredient',
          spices: {},
        },
      ],
      ingredientsMap: new Map([
        [
          ingredientId,
          {
            id: ingredientId,
            ingredientId: 'ingredient-1',
            name: 'Test Ingredient',
            spices: {},
          },
        ],
      ]),
      editingIds: new Set(),
      pausedIngredientIds: new Set(),
    });

    useCookbookStore.getState().upsert();

    const storedValue = localStorageMock.getItem('baratie-cookbook');
    expect(storedValue).not.toBeNull();

    const parsed = JSON.parse(storedValue!) as SavedRecipe[];
    expect(parsed).toHaveLength(2);

    const saved = parsed[0];
    expect(saved.id).not.toBe(recipeId);
    expect(saved.name).toBe('New Recipe Name');
    expect(saved.createdAt).toBeGreaterThan(createdAt);
    expect(saved.ingredients).toHaveLength(1);
  });

  it('does not save when the recipe name is empty and shows a warning', () => {
    useCookbookStore.setState({ nameInput: '   ' });
    useRecipeStore.setState({
      activeRecipeId: null,
      ingredients: [
        {
          id: crypto.randomUUID(),
          ingredientId: 'ingredient-1',
          name: 'Test Ingredient',
          spices: {},
        },
      ],
      ingredientsMap: new Map(),
      editingIds: new Set(),
      pausedIngredientIds: new Set(),
    });

    useCookbookStore.getState().upsert();

    const storedValue = localStorageMock.getItem('baratie-cookbook');
    expect(storedValue).toBeNull();

    const notifications = Array.from(useNotificationStore.getState().map.values());
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toBe('The recipe name cannot be empty.');
    expect(notifications[0].type).toBe('warning');
  });
});
