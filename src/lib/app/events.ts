import type { NotificationType } from '../components/main/NotificationPanel';
import type { IngredientItem, RecipeBookItem, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';
import type { RecipeCookResult } from '../core/Kitchen';
import type { SettingTab } from '../stores/useSettingStore';
import type { ThemeId } from '../stores/useThemeStore';

export interface AppEvents {
  'app:loading-status-updated': { message: string; hasError?: boolean };
  'app:initialized': undefined;

  'notification:show': { message: string; type?: NotificationType; title?: string; duration?: number };
  'notification:clear': undefined;
  'notification:remove': { id: string };

  'recipe:add-ingredient-requested': { ingredientId: string; initialSpices?: Readonly<Record<string, unknown>> };
  'recipe:clear-requested': undefined;
  'recipe:remove-ingredient-requested': { id: string };
  'recipe:reorder-ingredients-requested': { draggedId: string; targetId: string };
  'recipe:set-requested': { ingredients: ReadonlyArray<IngredientItem>; activeRecipeId: string | null };
  'recipe:update-spice-requested': { id: string; spiceId: string; rawValue: SpiceValue; spice: Readonly<SpiceDefinition> };
  'recipe:set-editing-id-requested': { id: string | null };

  'kitchen:cook-completed': RecipeCookResult;
  'kitchen:toggle-autocook-requested': undefined;
  'kitchen:set-input-requested': { data: string };

  'ui:open-cookbook-requested':
    | { mode: 'load' }
    | { mode: 'save'; ingredients: ReadonlyArray<IngredientItem>; activeRecipeId: string | null; name?: string };
  'ui:open-settings-requested': undefined;
  'ui:open-ingredient-manager-requested': undefined;

  'cookbook:delete-requested': { id: string };
  'cookbook:load-requested': { id: string };
  'cookbook:upsert-requested': undefined;
  'cookbook:export-all-requested': undefined;
  'cookbook:export-current-requested': undefined;
  'cookbook:import-from-file-requested': { file: File };
  'cookbook:merge-requested': { recipesToImport: ReadonlyArray<RecipeBookItem> };

  'settings:set-theme-requested': { id: ThemeId };
  'settings:set-active-tab-requested': { tab: SettingTab };

  'ingredients:toggle-category-requested': { category: string };
  'ingredients:toggle-ingredient-requested': { id: string };

  'favorites:toggle-requested': { id: string };

  'extensions:add-requested': { url: string };
  'extensions:remove-requested': { id: string };
  'extensions:refresh-requested': { id: string };
  'extensions:changed': undefined;
}
