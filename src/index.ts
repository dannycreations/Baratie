import React from 'react';
import ReactDOM from 'react-dom/client';
import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './app/Baratie';
import { appRegistry, errorHandler, ingredientRegistry, logger } from './app/container';
import { LogLevel } from './core/Logger';
import { clearNotifications, removeNotification, showNotification } from './helpers/notificationHelper';
import { addIngredient, clearRecipe, getActiveRecipeId, removeIngredient, updateSpice } from './helpers/recipeHelper';
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
import type { InputType } from './core/InputType';

const BARATIE_API = {
  logger,
  LogLevel,
  createRoot,
  app: appRegistry,
  error: errorHandler,
  ingredient: ingredientRegistry,
  helpers: {
    file: {
      download: triggerDownload,
      readAsBase64: readAsBase64,
      readAsText: readAsText,
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
      remove: removeIngredient,
      update: updateSpice,
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

export { create, React, ReactDOM, subscribeWithSelector, v };

declare global {
  // eslint-disable-next-line no-var
  var Baratie: BaratieApi;
}

if (typeof globalThis !== 'undefined') {
  globalThis.Baratie = BARATIE_API;
}
