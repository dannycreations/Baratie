import { memo, useId } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { EmptyView } from '../shared/View';
import { CookbookItem } from './CookbookItem';

import type { ChangeEvent, JSX, RefObject } from 'react';
import type { RecipeBookItem } from '../../core/IngredientRegistry';

interface CookbookLoadProps {
  readonly importRef: RefObject<HTMLInputElement | null>;
  readonly recipes: ReadonlyArray<RecipeBookItem>;
  readonly totalRecipes: number;
  readonly query: string;
  readonly onDelete: (id: string) => void;
  readonly onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onLoad: (id: string) => void;
  readonly onQueryChange: (query: string) => void;
}

export const CookbookLoad = memo<CookbookLoadProps>(
  ({ query, onQueryChange, recipes, totalRecipes, onLoad, onDelete, importRef, onImport }): JSX.Element => {
    const listId = useId();
    const theme = useThemeStore((state) => state.theme);

    return (
      <>
        <SearchListLayout
          containerClasses="flex h-full flex-col"
          listContent={
            recipes.length > 0 ? (
              <ul aria-label="List of saved recipes" className="space-y-1.5">
                {recipes.map((recipe) => (
                  <CookbookItem key={recipe.id} recipe={recipe} onDelete={onDelete} onLoad={onLoad} />
                ))}
              </ul>
            ) : (
              <EmptyView className="flex h-full w-full grow flex-col items-center justify-center p-4">
                {totalRecipes === 0 ? 'You have not saved any recipes yet.' : `No recipes found for "${query}".`}
              </EmptyView>
            )
          }
          listId={listId}
          listWrapperClasses="grow overflow-y-auto pt-3"
          query={query}
          searchAriaLabel="Search saved recipes"
          searchId="recipe-search"
          searchPlaceholder="Search Saved Recipes..."
          searchWrapperClasses={`border-b border-${theme.borderPrimary} pb-3`}
          onQueryChange={onQueryChange}
        />
        <input ref={importRef} accept=".json" type="file" aria-hidden="true" className="hidden" onChange={onImport} />
      </>
    );
  },
);
