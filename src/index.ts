import React from 'react';
import ReactDOM from 'react-dom/client';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './app/Baratie';
import { appRegistry, errorHandler, ingredientRegistry, logger } from './app/container';
import { InputType } from './core/InputType';
import { LogLevel } from './core/Logger';
import {
  closeCookbook,
  deleteRecipe,
  exportAll,
  exportSingle,
  getAllRecipes,
  importFromFile,
  loadRecipe,
  mergeRecipes,
  openCookbook,
  saveAllRecipes,
  setQuery,
  setRecipeName,
  upsertRecipe,
} from './helpers/cookbookHelper';
import { addExtension, removeExtension } from './helpers/extensionHelper';
import { toggleFavorite } from './helpers/favoriteHelper';
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
  updateSpice,
} from './helpers/recipeHelper';
import { readAsBase64, readAsText, triggerDownload } from './utilities/fileUtil';

import type { NotificationMessage, NotificationType } from '../src/components/main/NotificationPanel';
import type { BaratieOptions } from './app/Baratie';
import type {
  Ingredient,
  IngredientContext,
  IngredientDefinition,
  RecipeBookItem,
  ResultType,
  SpiceDefinition,
  SpiceValue,
} from './core/IngredientRegistry';

const BARATIE_API = {
  logger,
  LogLevel,
  createRoot,
  app: appRegistry,
  error: errorHandler,
  ingredient: ingredientRegistry,
  helpers: {
    cookbook: {
      close: closeCookbook,
      delete: deleteRecipe,
      exportAll,
      exportSingle,
      getAll: getAllRecipes,
      importFromFile,
      load: loadRecipe,
      merge: mergeRecipes,
      open: openCookbook,
      saveAll: saveAllRecipes,
      setName: setRecipeName,
      setQuery,
      upsert: upsertRecipe,
    },
    extension: {
      add: addExtension,
      remove: removeExtension,
    },
    favorite: {
      toggle: toggleFavorite,
    },
    file: {
      download: triggerDownload,
      readAsBase64,
      readAsText,
    },
    notification: {
      clear: clearNotifications,
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
      updateSpice,
    },
  },
} as const;

type BaratieApi = typeof BARATIE_API;

export type {
  BaratieApi,
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
  SpiceValue,
};

export { create, React, ReactDOM, subscribeWithSelector };

declare global {
  // eslint-disable-next-line no-var
  var Baratie: BaratieApi;
}

if (typeof globalThis !== 'undefined') {
  globalThis.Baratie = BARATIE_API;
}
