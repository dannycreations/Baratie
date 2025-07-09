import { memo, useId } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { EmptyView } from '../shared/View';
import { CookbookItem } from './CookbookItem';

import type { ChangeEvent, JSX, RefObject } from 'react';
import type { RecipeBookItem } from '../../core/IngredientRegistry';

interface CookbookLoadProps {
  readonly importRef: RefObject<HTMLInputElement | null>;
  readonly recipes: readonly RecipeBookItem[];
  readonly totalRecipes: number;
  readonly query: string;
  readonly onDelete: (id: string) => void;
  readonly onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onLoad: (id: string) => void;
  readonly onQueryChange: (term: string) => void;
}

export const CookbookLoad = memo(function CookbookLoad({
  query,
  onQueryChange,
  recipes,
  totalRecipes,
  onLoad,
  onDelete,
  importRef,
  onImport,
}: CookbookLoadProps): JSX.Element {
  const listId = useId();
  const theme = useThemeStore((state) => state.theme);

  return (
    <>
      <SearchListLayout
        containerClassName="flex h-full flex-col"
        listContent={
          recipes.length > 0 ? (
            <ul className="space-y-1.5" aria-label="List of saved recipes">
              {recipes.map((recipe) => (
                <CookbookItem key={recipe.id} recipe={recipe} onLoad={onLoad} onDelete={onDelete} />
              ))}
            </ul>
          ) : (
            <EmptyView className="flex h-full w-full flex-grow flex-col items-center justify-center p-4">
              {totalRecipes === 0 ? 'You have not saved any recipes yet.' : `No recipes found for "${query}".`}
            </EmptyView>
          )
        }
        listId={listId}
        listWrapperClassName="flex-grow overflow-y-auto pt-3"
        onSearchChange={onQueryChange}
        searchAriaLabel="Search saved recipes"
        searchId="recipe-search"
        searchPlaceholder="Search Saved Recipes..."
        searchTerm={query}
        searchWrapperClassName={`border-b pb-3 ${theme.inputBorder}`}
      />
      <input ref={importRef} type="file" accept=".json" onChange={onImport} className="hidden" aria-hidden="true" />
    </>
  );
});
