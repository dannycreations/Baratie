import { memo, useCallback, useId, useMemo, useState } from 'react';

import { ingredientRegistry } from '../../app/container';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { ChevronRightIcon } from '../shared/Icon';
import { BooleanInput } from '../shared/input/BooleanInput';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { Modal } from '../shared/Modal';
import { Tooltip } from '../shared/Tooltip';
import { EmptyView } from '../shared/View';
import { IngredientList } from './IngredientList';

import type { JSX, KeyboardEvent } from 'react';
import type { IngredientDefinition } from '../../core/IngredientRegistry';

export const IngredientManager = memo(function IngredientManager(): JSX.Element {
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

  const allIngredients = useMemo(() => ingredientRegistry.getAllIngredients(), [registryVersion]);

  const ingredientsByCategory = useMemo(() => {
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

  const filtered = useMemo(() => {
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

  const renderManagerHeader = useCallback(
    (category: symbol, isExpanded: boolean, onToggle: (category: symbol) => void) => {
      const categoryId = `manager-category-${(category.description ?? '').replace(/\s+/g, '-')}`;
      const isCategoryDisabled = disabledCategories.includes(category);
      const categoryDescription = category.description ?? '';

      return (
        <div
          aria-expanded={isExpanded}
          aria-label={`Toggle Category ${categoryDescription} Details`}
          className={`flex h-12 w-full cursor-pointer items-center justify-between p-3 ${theme.itemBg} ${theme.itemBgHover} focus:outline-none focus:ring-2 focus:ring-inset ${theme.accentRing}`}
          onClick={() => onToggle(category)}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onToggle(category);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className="flex items-center gap-3"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
            }}
            role="presentation"
          >
            <BooleanInput
              id={`${categoryId}-toggle`}
              ariaLabel={`Enable or Disable Category: ${categoryDescription}`}
              checked={!isCategoryDisabled}
              onChange={() => toggleCategory(category)}
            />
            <label
              htmlFor={`${categoryId}-toggle`}
              className={`cursor-pointer font-medium ${isCategoryDisabled ? `${theme.textQuaternary} line-through` : theme.textSecondary}`}
            >
              {categoryDescription}
            </label>
          </div>
          <ChevronRightIcon
            aria-hidden="true"
            className={`flex-shrink-0 transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
            size={20}
          />
        </div>
      );
    },
    [disabledCategories, toggleCategory, theme],
  );

  const renderManagerItem = useCallback(
    (ingredient: IngredientDefinition) => {
      const isCategoryDisabled = disabledCategories.includes(ingredient.category);
      const ingredientName = ingredient.name.description ?? 'Unnamed Ingredient';
      const ingredientId = `manager-ingredient-${ingredientName.replace(/\s+/g, '-')}`;
      const isIngredientDisabled = disabledIngredients.includes(ingredient.name);
      const isDisabled = isCategoryDisabled || isIngredientDisabled;

      const labelClasses = [
        'cursor-pointer truncate text-sm transition-colors duration-150',
        theme.accentTextGroupHover,
        isDisabled ? `${theme.textQuaternary} line-through` : theme.textSecondary,
      ]
        .filter(Boolean)
        .join(' ');

      const leftColumn = (
        <div className="flex min-w-0 items-center gap-3">
          <BooleanInput
            id={ingredientId}
            ariaLabel={`Toggle ingredient ${ingredientName}`}
            checked={!isIngredientDisabled}
            disabled={isCategoryDisabled}
            onChange={() => toggleIngredient(ingredient.name)}
          />
          <Tooltip content={ingredient.description} position="top" tooltipClassName="max-w-xs">
            <label htmlFor={ingredientId} className={labelClasses}>
              {ingredientName}
            </label>
          </Tooltip>
        </div>
      );

      return (
        <li key={ingredient.name.toString()}>
          <ItemListLayout
            className={`group h-11 rounded-md px-2 py-1.5 transition-colors duration-150 ${theme.itemBg} ${theme.itemBgMutedHover}`}
            leftContent={leftColumn}
            leftWrapperClassName="min-w-0 flex-grow"
          />
        </li>
      );
    },
    [disabledCategories, disabledIngredients, toggleIngredient, theme],
  );

  const content = useMemo(() => {
    if (filtered.size === 0 && query.trim() !== '') {
      return (
        <EmptyView className="flex h-full w-full flex-grow flex-col items-center justify-center p-4">
          {`No Ingredients Found for "${query}".`}
        </EmptyView>
      );
    }
    return <IngredientList itemsByCategory={filtered} renderCategoryHeader={renderManagerHeader} renderItem={renderManagerItem} query={query} />;
  }, [filtered, query, renderManagerHeader, renderManagerItem]);

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} title="Manage Ingredients" size="lg" contentClassName="max-h-[80vh]">
      <SearchListLayout
        containerClassName="flex h-full flex-col"
        listContent={content}
        listId={listId}
        listWrapperClassName="mt-2 flex-grow overflow-y-auto"
        onSearchChange={setQuery}
        searchAriaLabel="Search ingredients or categories"
        searchId="ingredient-manager-search"
        searchPlaceholder="Search Ingredients..."
        searchTerm={query}
      />
    </Modal>
  );
});
