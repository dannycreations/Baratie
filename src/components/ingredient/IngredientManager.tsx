import { cn } from 'cnfast';
import { memo, useCallback, useMemo, useRef } from 'react';

import { ingredientRegistry } from '../../app/container';
import { createIngredientSearchPredicate } from '../../helpers/ingredientHelper';
import { filterGroupedList, groupListByCategory } from '../../helpers/listHelper';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useSearch } from '../../hooks/useSearch';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchInput } from '../shared/input/SearchInput';
import { GroupListLayout } from '../shared/layout/ListLayout';
import { Modal } from '../shared/Modal';
import { ScrollArea } from '../shared/ScrollArea';

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

  const searchRef = useRef<HTMLInputElement>(null);

  useAutoFocus(searchRef, isModalOpen);

  const allIngredients = useMemo<ReadonlyArray<IngredientProps>>(() => {
    return ingredientRegistry.getAll();
  }, [registryVersion]);

  const ingredientsByCategory = useMemo(() => {
    return groupListByCategory(allIngredients, (ingredient) => ingredient.category);
  }, [allIngredients]);

  const filteredList = useMemo(
    () => filterGroupedList(ingredientsByCategory, deferredQuery, createIngredientSearchPredicate(deferredQuery)),
    [ingredientsByCategory, deferredQuery],
  );

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
          <span className={cn('list-item-label', isCategoryDisabled ? 'text-content-disabled line-through' : 'text-content-secondary')}>
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
        <SearchInput
          id="ingredient-manager-search"
          inputRef={searchRef}
          value={query}
          placeholder="Search Ingredients..."
          onChange={onQueryChange}
          onClear={onClear}
        />
        <ScrollArea className="flex-1-overflow-auto">{content}</ScrollArea>
      </div>
    </Modal>
  );
});
