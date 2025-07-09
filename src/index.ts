import React from 'react';
import ReactDOM from 'react-dom/client';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './app/Baratie';
import { appRegistry, errorHandler, ingredientRegistry, logger } from './app/container';
import { InputType } from './core/InputType';
import { LogLevel } from './core/Logger';
import {
  addOrUpdateRecipe,
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
  setRecipeName,
  setSearchQuery,
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
  updateSpiceValue,
} from './helpers/recipeHelper';
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

export { create, React, ReactDOM, subscribeWithSelector };

const BARATIE_HELPERS = {
  cookbook: {
    addOrUpdate: addOrUpdateRecipe,
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
    setQuery: setSearchQuery,
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
    readB64: readAsBase64,
    readText: readAsText,
  },
  notification: {
    show: showNotification,
    remove: removeNotification,
    clear: clearNotifications,
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
} as const;

const BARATIE_API = {
  logger,
  LogLevel,
  createRoot,
  app: appRegistry,
  error: errorHandler,
  ingredient: ingredientRegistry,
  helpers: BARATIE_HELPERS,
} as const;

declare global {
  var Baratie: typeof BARATIE_API;
}

if (typeof globalThis !== 'undefined') {
  globalThis.Baratie = BARATIE_API;
}
