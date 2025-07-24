import { memo, useCallback, useId, useMemo, useState } from 'react';

import { ingredientRegistry } from '../../app/container';
import { groupAndSortIngredients, searchGroupedIngredients } from '../../helpers/ingredientHelper';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { Modal } from '../shared/Modal';
import { IngredientList } from './IngredientList';

import type { JSX } from 'react';
import type { IngredientProps } from '../../core/IngredientRegistry';
import type { BaseListItem } from './IngredientList';

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

  const allIngredients = useMemo<ReadonlyArray<IngredientProps>>(() => {
    return ingredientRegistry.getAllIngredients();
  }, [registryVersion]);

  const ingredientsByCategory = useMemo(() => {
    return groupAndSortIngredients(allIngredients);
  }, [allIngredients]);

  const filteredList = useMemo(() => {
    return searchGroupedIngredients(ingredientsByCategory, query);
  }, [ingredientsByCategory, query]);

  const renderHeader = useCallback(
    (category: string, _items: ReadonlyArray<BaseListItem>): JSX.Element => {
      const categoryId = `manager-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
      const isCategoryDisabled = disabledCategories.has(category);

      return (
        <div className="flex items-center gap-3">
          <BooleanInput id={`${categoryId}-toggle`} checked={!isCategoryDisabled} onChange={() => toggleCategory(category)} />
          <label
            htmlFor={`${categoryId}-toggle`}
            className={`cursor-pointer font-medium ${isCategoryDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`}`}
          >
            {category}
          </label>
        </div>
      );
    },
    [disabledCategories, toggleCategory, theme],
  );

  const renderItemPrefix = useCallback(
    (ingredient: BaseListItem): JSX.Element => {
      const isCategoryDisabled = disabledCategories.has(ingredient.category);
      const ingredientId = `manager-ingredient-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}`;
      const isIngredientDisabled = disabledIngredients.has(ingredient.id);

      return (
        <BooleanInput
          id={ingredientId}
          checked={!isIngredientDisabled}
          disabled={isCategoryDisabled}
          onChange={() => toggleIngredient(ingredient.id)}
        />
      );
    },
    [disabledCategories, disabledIngredients, toggleIngredient],
  );

  const isItemDisabled = useCallback(
    (ingredient: BaseListItem) => {
      return disabledCategories.has(ingredient.category) || disabledIngredients.has(ingredient.id);
    },
    [disabledCategories, disabledIngredients],
  );

  const content = (
    <IngredientList
      isItemDisabled={isItemDisabled}
      itemsByCategory={filteredList}
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
