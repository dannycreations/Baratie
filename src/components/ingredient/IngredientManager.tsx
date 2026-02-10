import { clsx } from 'clsx';
import { memo, useCallback, useId, useMemo, useRef } from 'react';

import { ingredientRegistry } from '../../app/container';
import { groupAndSortIngredients, searchGroupedIngredients } from '../../helpers/ingredientHelper';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useOverflow } from '../../hooks/useOverflow';
import { useSearch } from '../../hooks/useSearch';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchInput } from '../shared/input/SearchInput';
import { GroupListLayout } from '../shared/layout/ListLayout';
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

  const { query, deferredQuery, onQueryChange, onClear } = useSearch();

  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const { ref: scrollRef, className: scrollClasses } = useOverflow<HTMLDivElement>();

  useAutoFocus(searchRef, isModalOpen);

  const allIngredients = useMemo<ReadonlyArray<IngredientProps>>(() => {
    return ingredientRegistry.getAll();
  }, [registryVersion]);

  const ingredientsByCategory = useMemo(() => {
    return groupAndSortIngredients(allIngredients);
  }, [allIngredients]);

  const filteredList = useMemo(() => {
    return searchGroupedIngredients(ingredientsByCategory, deferredQuery);
  }, [ingredientsByCategory, deferredQuery]);

  const renderHeader = useCallback(
    (category: string, _items: ReadonlyArray<GroupListItem>): JSX.Element => {
      const categoryId = `manager-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
      const isCategoryDisabled = disabledCategories.has(category);

      return (
        <div className="list-item-header">
          <BooleanInput
            id={`${categoryId}-toggle`}
            checked={!isCategoryDisabled}
            offBackgroundColor="bg-border-primary"
            onChange={() => toggleCategory(category)}
          />
          <span className={clsx('list-item-label', isCategoryDisabled ? 'text-content-disabled line-through' : 'text-content-secondary')}>
            {category}
          </span>
        </div>
      );
    },
    [disabledCategories, toggleCategory],
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
          offBackgroundColor="bg-border-primary"
          onChange={() => toggleIngredient(ingredient.id)}
        />
      );
    },
    [disabledCategories, disabledIngredients, toggleIngredient],
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
      query={deferredQuery}
      isItemDisabled={isItemDisabled}
      renderHeader={renderHeader}
      renderItemPrefix={renderItemPrefix}
    />
  );

  return (
    <Modal isOpen={isModalOpen} size="lg" title="Manage Ingredients" onClose={closeModal}>
      <div className="flex-col-gap-2 h-full">
        <div>
          <SearchInput
            id="ingredient-manager-search"
            inputRef={searchRef}
            value={query}
            placeholder="Search Ingredients..."
            onChange={onQueryChange}
            onClear={onClear}
          />
        </div>
        <div id={listId} ref={scrollRef} className={clsx('flex-1-overflow-auto', scrollClasses)}>
          {content}
        </div>
      </div>
    </Modal>
  );
});
