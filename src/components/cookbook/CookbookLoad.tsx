import { clsx } from 'clsx';
import { memo, useId, useMemo } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useOverflow } from '../../hooks/useOverflow';
import { SaveIcon } from '../shared/Icon';
import { StringInput } from '../shared/input/StringInput';
import { EmptyView } from '../shared/View';
import { CookbookItem } from './CookbookItem';

import type { ChangeEvent, JSX, RefObject } from 'react';
import type { RecipebookItem } from '../../core/IngredientRegistry';
import type { CookbookItemHandlers } from './CookbookItem';

interface CookbookLoadProps extends CookbookItemHandlers {
  readonly recipes: ReadonlyArray<RecipebookItem>;
  readonly totalRecipes: number;
  readonly query: string;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly onQueryChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  readonly onClear: () => void;
}

export const CookbookLoad = memo<CookbookLoadProps>(
  ({ query, onQueryChange, onClear, recipes, totalRecipes, onLoad, onDelete, searchRef }): JSX.Element => {
    const listId = useId();
    const { ref: scrollRef, className: scrollClasses } = useOverflow<HTMLDivElement>();

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
          className="h-full w-full"
          icon={totalRecipes === 0 ? <SaveIcon size={ICON_SIZES.XXL} /> : undefined}
          title={totalRecipes > 0 ? 'No Matches Found' : 'Cookbook is Empty'}
        >
          {totalRecipes === 0 ? 'Build a recipe and save it to your cookbook!' : `No recipes found for "${query}".`}
        </EmptyView>
      );
    }, [recipes, onDelete, onLoad, query, totalRecipes]);

    return (
      <div className="flex h-full flex-col gap-2 min-h-0">
        <div className="border-b border-border-primary pb-2">
          <StringInput
            id="recipe-search"
            inputRef={searchRef}
            type="search"
            value={query}
            placeholder="Search Saved Recipes..."
            showClearButton
            onChange={onQueryChange}
            onClear={onClear}
          />
        </div>
        <div id={listId} ref={scrollRef} className={clsx('grow overflow-y-auto', scrollClasses)}>
          {listContent}
        </div>
      </div>
    );
  },
);
