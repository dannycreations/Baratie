import { memo, useCallback, useId, useMemo, useRef, useState } from 'react';

import { ingredientRegistry } from '../../app/container';
import { groupAndSortIngredients, searchGroupedIngredients } from '../../helpers/ingredientHelper';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { GroupListLayout, SearchListLayout } from '../shared/layout/ListLayout';
import { Modal } from '../shared/Modal';

import type { JSX } from 'react';
import type { IngredientProps } from '../../core/IngredientRegistry';
import type { GroupListItem } from '../shared/layout/ListLayout';

export const IngredientManager = memo((): JSX.Element => {
  const isModalOpen = useModalStore((state) => state.currentModal?.type === 'ingredient');
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
    return ingredientRegistry.getAll();
  }, [registryVersion]);

  const ingredientsByCategory = useMemo(() => {
    return groupAndSortIngredients(allIngredients);
  }, [allIngredients]);

  const filteredList = useMemo(() => {
    return searchGroupedIngredients(ingredientsByCategory, query);
  }, [ingredientsByCategory, query]);

  const renderHeader = useCallback(
    (category: string, _items: ReadonlyArray<GroupListItem>): JSX.Element => {
      const categoryId = `manager-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
      const isCategoryDisabled = disabledCategories.has(category);

      return (
        <div className="flex min-w-0 items-center gap-2">
          <BooleanInput
            id={`${categoryId}-toggle`}
            checked={!isCategoryDisabled}
            offBackgroundColor={theme.borderPrimary}
            onChange={() => toggleCategory(category)}
          />
          <span
            className={`truncate font-medium cursor-pointer ${isCategoryDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`}`}
          >
            {category}
          </span>
        </div>
      );
    },
    [disabledCategories, toggleCategory, theme],
  );

  const renderItemPrefix = useCallback(
    (ingredient: GroupListItem): JSX.Element => {
      const isCategoryDisabled = disabledCategories.has(ingredient.category);
      const ingredientId = `manager-ingredient-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}`;
      const isIngredientDisabled = disabledIngredients.has(ingredient.id);

      return (
        <BooleanInput
          id={ingredientId}
          checked={!isIngredientDisabled}
          disabled={isCategoryDisabled}
          offBackgroundColor={theme.borderPrimary}
          onChange={() => toggleIngredient(ingredient.id)}
        />
      );
    },
    [disabledCategories, disabledIngredients, toggleIngredient, theme],
  );

  const isItemDisabled = useCallback(
    (ingredient: GroupListItem): boolean => {
      return disabledCategories.has(ingredient.category) || disabledIngredients.has(ingredient.id);
    },
    [disabledCategories, disabledIngredients],
  );

  const content = (
    <GroupListLayout
      itemsByCategory={filteredList}
      query={query}
      isItemDisabled={isItemDisabled}
      renderHeader={renderHeader}
      renderItemPrefix={renderItemPrefix}
    />
  );

  return (
    <Modal isOpen={isModalOpen} size="lg" title="Manage Ingredients" contentClasses="max-h-[80vh]" onClose={closeModal}>
      <SearchListLayout
        listId={listId}
        listContent={content}
        search={{
          query,
          onQueryChange: setQuery,
          id: 'ingredient-manager-search',
          inputRef: searchRef,
          placeholder: 'Search Ingredients...',
        }}
      />
    </Modal>
  );
});
