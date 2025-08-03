import { memo, useId } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { SaveIcon } from '../shared/Icon';
import { SearchListLayout } from '../shared/layout/ListLayout';
import { EmptyView } from '../shared/View';
import { CookbookItem } from './CookbookItem';

import type { JSX, RefObject } from 'react';
import type { RecipebookItem } from '../../core/IngredientRegistry';
import type { CookbookItemHandlers } from './CookbookItem';

interface CookbookLoadProps extends CookbookItemHandlers {
  readonly recipes: ReadonlyArray<RecipebookItem>;
  readonly totalRecipes: number;
  readonly query: string;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly onQueryChange: (query: string) => void;
}

export const CookbookLoad = memo<CookbookLoadProps>(({ query, onQueryChange, recipes, totalRecipes, onLoad, onDelete, searchRef }): JSX.Element => {
  const listId = useId();
  const theme = useThemeStore((state) => state.theme);

  return (
    <SearchListLayout
      listId={listId}
      listContent={
        recipes.length > 0 ? (
          <ul className="space-y-2">
            {recipes.map((recipe) => (
              <CookbookItem key={recipe.id} recipe={recipe} onDelete={onDelete} onLoad={onLoad} query={query} />
            ))}
          </ul>
        ) : (
          <EmptyView
            className="flex h-full w-full flex-col items-center justify-center p-3"
            icon={totalRecipes === 0 ? <SaveIcon size={48} /> : undefined}
            title={totalRecipes > 0 ? 'No Matches Found' : 'Cookbook is Empty'}
          >
            {totalRecipes === 0 ? 'Build a recipe and save it to your cookbook!' : `No recipes found for "${query}".`}
          </EmptyView>
        )
      }
      search={{
        query,
        onQueryChange,
        id: 'recipe-search',
        inputRef: searchRef,
        placeholder: 'Search Saved Recipes...',
        wrapperClasses: `pb-2 border-b border-${theme.borderPrimary}`,
      }}
    />
  );
});
