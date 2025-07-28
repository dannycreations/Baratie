import { memo, useCallback, useId, useMemo, useRef, useState } from 'react';

import { ingredientRegistry } from '../../app/container';
import { groupAndSortIngredients, searchGroupedIngredients } from '../../helpers/ingredientHelper';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchListLayout } from '../shared/layout/ListLayout';
import { Modal } from '../shared/Modal';
import { IngredientList } from './IngredientList';

import type { JSX } from 'react';
import type { IngredientProps } from '../../core/IngredientRegistry';
import type { BaseListItem } from './IngredientList';

export const IngredientManager = memo((): JSX.Element => {
  const isModalOpen = useModalStore((state) => state.activeModal === 'ingredientManager');
  const closeModal = useModalStore((state) => state.closeModal);
  const disabledCategories = useIngredientStore((state) => state.disabledCategories);
  const disabledIngredients = useIngredientStore((state) => state.disabledIngredients);
  const toggleCategory = useIngredientStore((state) => state.toggleCategory);
  const toggleIngredient = useIngredientStore((state) => state.toggleIngredient);
  const registryVersion = useIngredientStore((state) => state.registryVersion);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState('');

  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  useAutoFocus(searchRef, isModalOpen);

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
        <div className="flex min-w-0 items-center gap-2">
          <BooleanInput id={`${categoryId}-toggle`} checked={!isCategoryDisabled} onChange={() => toggleCategory(category)} />
          <label
            className={`truncate cursor-pointer font-medium ${isCategoryDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`}`}
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
    (ingredient: BaseListItem): boolean => {
      return disabledCategories.has(ingredient.category) || disabledIngredients.has(ingredient.id);
    },
    [disabledCategories, disabledIngredients],
  );

  const content = (
    <IngredientList
      itemsByCategory={filteredList}
      query={query}
      isItemDisabled={isItemDisabled}
      renderHeader={renderHeader}
      renderItemPrefix={renderItemPrefix}
    />
  );

  return (
    <Modal isOpen={isModalOpen} size="lg" title="Manage Ingredients" bodyClasses="p-3" contentClasses="max-h-[80vh]" onClose={closeModal}>
      <SearchListLayout
        listId={listId}
        listContent={content}
        search={{
          query,
          onQueryChange: setQuery,
          id: 'ingredient-manager-search',
          inputRef: searchRef,
          ariaLabel: 'Search ingredients or categories',
          placeholder: 'Search Ingredients...',
        }}
      />
    </Modal>
  );
});
