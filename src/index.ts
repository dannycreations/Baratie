import { createRoot } from './app/Baratie';
import { appRegistry, errorHandler, ingredientRegistry, logger } from './app/container';
import { InputType } from './core/InputType';
import {
  addOrUpdateRecipe,
  closeCookbook,
  deleteRecipe,
  exportAll,
  exportSingle,
  getAllRecipes,
  importFromFile,
  initCookbook,
  loadRecipe,
  mergeRecipes,
  openCookbook,
  saveAllRecipes,
  setRecipeName,
  setSearchQuery,
} from './helpers/cookbookHelper';
import { initFavorites, toggleFavorite } from './helpers/favoriteHelper';
import { clearNotifications, removeNotification, showNotification } from './helpers/notificationHelper';
import {
  addIngredient,
  clearRecipe,
  getActiveRecipeId,
  getAllIngredients,
  removeIngredient,
  reorderIngredients,
  setIngredientSpices,
  setRecipe,
  updateSpiceValue,
} from './helpers/recipeHelper';
import { getVisibleSpices, updateAndValidate, validateSpices } from './helpers/spiceHelper';
import { readAsBase64, readAsText, triggerDownload } from './utilities/fileUtil';

import type { BaratieOptions } from './app/Baratie';
import type { NotificationMessage, NotificationType } from './app/constants';
import type { Ingredient, IngredientContext, IngredientDefinition, RecipeBookItem, ResultType, SpiceDefinition } from './core/IngredientRegistry';

export type {
  BaratieOptions,
  Ingredient,
  IngredientContext,
  IngredientDefinition,
  InputType,
  NotificationMessage,
  NotificationType,
  RecipeBookItem,
  ResultType,
  SpiceDefinition,
};

const BARATIE_HELPERS = {
  cookbook: {
    addOrUpdate: addOrUpdateRecipe,
    close: closeCookbook,
    delete: deleteRecipe,
    exportAll,
    exportSingle,
    getAll: getAllRecipes,
    importFromFile,
    init: initCookbook,
    load: loadRecipe,
    merge: mergeRecipes,
    open: openCookbook,
    saveAll: saveAllRecipes,
    setName: setRecipeName,
    setQuery: setSearchQuery,
  },
  favorite: {
    init: initFavorites,
    toggle: toggleFavorite,
  },
  file: {
    download: triggerDownload,
    readB64: readAsBase64,
    readText: readAsText,
  },
  ingredient: {
    getVisible: getVisibleSpices,
    updateAndValidate,
    validate: validateSpices,
  },
  notification: {
    clearAll: clearNotifications,
    remove: removeNotification,
    show: showNotification,
  },
  recipe: {
    add: addIngredient,
    clear: clearRecipe,
    getActiveId: getActiveRecipeId,
    getAll: getAllIngredients,
    remove: removeIngredient,
    reorder: reorderIngredients,
    set: setRecipe,
    setSpices: setIngredientSpices,
    updateSpice: updateSpiceValue,
  },
};

const BARATIE_API = {
  createRoot,
  appRegistry,
  errorHandler,
  ingredientRegistry,
  logger,
  helpers: BARATIE_HELPERS,
  InputType,
};

declare global {
  var Baratie: typeof BARATIE_API;
}

if (typeof globalThis !== 'undefined') {
  globalThis.Baratie = BARATIE_API;
}
