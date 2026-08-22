import { Save } from 'lucide-react';
import { memo, useMemo } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { SearchInput } from '../shared/input/SearchInput';
import { ScrollArea } from '../shared/ScrollArea';
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
  readonly onQueryChange: (value: string) => void;
  readonly onClear: () => void;
}

export const CookbookLoad = memo<CookbookLoadProps>(
  ({ query, onQueryChange, onClear, recipes, totalRecipes, onLoad, onDelete, searchRef }): JSX.Element => {
    const listContent = useMemo(() => {
      if (recipes.length > 0) {
        return (
          <ul className="list-container">
            {recipes.map((recipe) => (
              <CookbookItem key={recipe.id} recipe={recipe} onDelete={onDelete} onLoad={onLoad} query={query} />
            ))}
          </ul>
        );
      }

      return (
        <EmptyView
          className="h-full"
          icon={totalRecipes === 0 ? <Save size={ICON_SIZES.LG} /> : undefined}
          title={totalRecipes > 0 ? 'No Matches Found' : 'Cookbook is Empty'}
        >
          {totalRecipes === 0 ? 'Build a recipe and save it to your cookbook!' : `No recipes found for "${query}".`}
        </EmptyView>
      );
    }, [recipes, onDelete, onLoad, query, totalRecipes]);

    return (
      <div className="flex-col-gap-2 h-full">
        <div className="shrink-0 border-b border-border-primary pb-2">
          <SearchInput
            id="recipe-search"
            inputRef={searchRef}
            value={query}
            placeholder="Search Saved Recipes..."
            onChange={onQueryChange}
            onClear={onClear}
          />
        </div>
        <ScrollArea className="flex-1-overflow-auto">{listContent}</ScrollArea>
      </div>
    );
  },
);
