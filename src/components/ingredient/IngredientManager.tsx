import { memo, useCallback, useId, useMemo, useState } from 'react';

import { ingredientRegistry } from '../../app/container';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { Modal } from '../shared/Modal';
import { IngredientList } from './IngredientList';

import type { JSX } from 'react';
import type { IngredientDefinition } from '../../core/IngredientRegistry';

export const IngredientManager = memo((): JSX.Element => {
  const isModalOpen = useIngredientStore((state) => state.isModalOpen);
  const closeModal = useIngredientStore((state) => state.closeModal);
  const disabledCategories = useIngredientStore((state) => state.disabledCategories);
  const disabledIngredients = useIngredientStore((state) => state.disabledIngredients);
  const toggleCategory = useIngredientStore((state) => state.toggleCategory);
  const toggleIngredient = useIngredientStore((state) => state.toggleIngredient);
  const registryVersion = useIngredientStore((state) => state.registryVersion);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState('');
  const listId = useId();

  const allIngredients = useMemo<readonly IngredientDefinition[]>(() => ingredientRegistry.getAllIngredients(), [registryVersion]);

  const ingredientsByCategory = useMemo<Map<symbol, IngredientDefinition[]>>(() => {
    const grouped = new Map<symbol, IngredientDefinition[]>();
    for (const ingredient of allIngredients) {
      const category = ingredient.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(ingredient);
    }
    for (const ingredients of grouped.values()) {
      ingredients.sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? ''));
    }
    return new Map([...grouped.entries()].sort((a, b) => (a[0].description ?? '').localeCompare(b[0].description ?? '')));
  }, [allIngredients]);

  const filtered = useMemo<Map<symbol, readonly IngredientDefinition[]>>(() => {
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery) {
      return ingredientsByCategory;
    }
    const filteredMap = new Map<symbol, readonly IngredientDefinition[]>();

    for (const [category, ingredients] of ingredientsByCategory.entries()) {
      const categoryName = category.description ?? '';
      const categoryMatches = categoryName.toLowerCase().includes(lowerQuery);
      const matchingIngredients = ingredients.filter(
        (ingredient) =>
          (ingredient.name.description ?? '').toLowerCase().includes(lowerQuery) || ingredient.description.toLowerCase().includes(lowerQuery),
      );
      if (categoryMatches) {
        filteredMap.set(category, ingredients);
      } else if (matchingIngredients.length > 0) {
        filteredMap.set(category, matchingIngredients);
      }
    }
    return filteredMap;
  }, [ingredientsByCategory, query]);

  const renderHeader = useCallback(
    (category: symbol): JSX.Element => {
      const categoryId = `manager-category-${(category.description ?? '').replace(/\s+/g, '-')}`;
      const isCategoryDisabled = disabledCategories.includes(category);

      return (
        <div className="flex items-center gap-3">
          <BooleanInput id={`${categoryId}-toggle`} checked={!isCategoryDisabled} onChange={() => toggleCategory(category)} />
          <label
            className={`font-medium cursor-pointer ${isCategoryDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`}`}
          >
            {category.description}
          </label>
        </div>
      );
    },
    [disabledCategories, toggleCategory, theme],
  );

  const renderItemPrefix = useCallback(
    (ingredient: IngredientDefinition): JSX.Element => {
      const isCategoryDisabled = disabledCategories.includes(ingredient.category);
      const ingredientName = ingredient.name.description ?? 'Unnamed Ingredient';
      const ingredientId = `manager-ingredient-${ingredientName.replace(/\s+/g, '-')}`;
      const isIngredientDisabled = disabledIngredients.includes(ingredient.name);

      return (
        <BooleanInput
          id={ingredientId}
          checked={!isIngredientDisabled}
          disabled={isCategoryDisabled}
          onChange={() => toggleIngredient(ingredient.name)}
        />
      );
    },
    [disabledCategories, disabledIngredients, toggleIngredient],
  );

  const isItemDisabled = useCallback(
    (ingredient: IngredientDefinition) => {
      return disabledCategories.includes(ingredient.category) || disabledIngredients.includes(ingredient.name);
    },
    [disabledCategories, disabledIngredients],
  );

  const content = (
    <IngredientList
      isItemDisabled={isItemDisabled}
      itemsByCategory={filtered}
      query={query}
      renderHeader={renderHeader}
      renderItemPrefix={renderItemPrefix}
    />
  );

  return (
    <Modal contentClasses="max-h-[80vh]" isOpen={isModalOpen} size="lg" title="Manage Ingredients" onClose={closeModal}>
      <SearchListLayout
        containerClasses="flex h-full flex-col"
        listContent={content}
        listId={listId}
        listWrapperClasses="grow mt-2 overflow-y-auto"
        query={query}
        searchAriaLabel="Search ingredients or categories"
        searchId="ingredient-manager-search"
        searchPlaceholder="Search Ingredients..."
        onQueryChange={setQuery}
      />
    </Modal>
  );
});
