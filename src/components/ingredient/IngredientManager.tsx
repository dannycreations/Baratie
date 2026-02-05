import { clsx } from 'clsx';
import { memo, useCallback, useDeferredValue, useId, useMemo, useRef, useState } from 'react';

import { ingredientRegistry } from '../../app/container';
import { groupAndSortIngredients, searchGroupedIngredients } from '../../helpers/ingredientHelper';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useOverflow } from '../../hooks/useOverflow';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { StringInput } from '../shared/input/StringInput';
import { GroupListLayout } from '../shared/layout/ListLayout';
import { Modal } from '../shared/Modal';

import type { ChangeEvent, JSX } from 'react';
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
  const deferredQuery = useDeferredValue(query);
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

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery('');
  }, []);

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
            className={clsx(
              'truncate font-medium cursor-pointer',
              isCategoryDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`,
            )}
          >
            {category}
          </span>
        </div>
      );
    },
    [disabledCategories, theme, toggleCategory],
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
    [disabledCategories, disabledIngredients, theme, toggleIngredient],
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
      <div className="flex h-full flex-col gap-2 min-h-0">
        <div>
          <StringInput
            id="ingredient-manager-search"
            type="search"
            inputRef={searchRef}
            value={query}
            placeholder="Search Ingredients..."
            showClearButton
            onChange={handleQueryChange}
            onClear={handleClearQuery}
          />
        </div>
        <div id={listId} ref={scrollRef} className={clsx('grow overflow-y-auto', scrollClasses)}>
          {content}
        </div>
      </div>
    </Modal>
  );
});
