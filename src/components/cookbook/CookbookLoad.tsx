import { memo, useId } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { SaveIcon } from '../shared/Icon';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { EmptyView } from '../shared/View';
import { CookbookItem } from './CookbookItem';

import type { ChangeEvent, JSX, RefObject } from 'react';
import type { RecipebookItem } from '../../core/IngredientRegistry';
import type { CookbookItemHandlers } from './CookbookItem';

interface CookbookLoadProps extends CookbookItemHandlers {
  readonly importRef: RefObject<HTMLInputElement | null>;
  readonly recipes: ReadonlyArray<RecipebookItem>;
  readonly totalRecipes: number;
  readonly query: string;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onQueryChange: (query: string) => void;
}

export const CookbookLoad = memo<CookbookLoadProps>(
  ({ query, onQueryChange, recipes, totalRecipes, onLoad, onDelete, importRef, onImport, searchRef }): JSX.Element => {
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
              <EmptyView
                className="flex h-full w-full grow flex-col items-center justify-center p-4"
                icon={totalRecipes === 0 ? <SaveIcon size={48} /> : undefined}
                title={totalRecipes > 0 ? 'No Matches Found' : 'Cookbook is Empty'}
              >
                {totalRecipes === 0 ? 'Build a recipe and save it to your cookbook!' : `No recipes found for "${query}".`}
              </EmptyView>
            )
          }
          listId={listId}
          listWrapperClasses="grow overflow-y-auto pt-3"
          search={{
            query,
            onQueryChange,
            ariaLabel: 'Search saved recipes',
            id: 'recipe-search',
            placeholder: 'Search Saved Recipes...',
            wrapperClasses: `border-b border-${theme.borderPrimary} pb-3`,
            inputRef: searchRef,
          }}
        />
        <input ref={importRef} accept=".json" type="file" aria-hidden="true" className="hidden" onChange={onImport} />
      </>
    );
  },
);
