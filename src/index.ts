import React from 'react';
import ReactDOM from 'react-dom/client';
import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './app/Baratie';
import { appRegistry, errorHandler, ingredientRegistry, logger } from './app/container';
import { LogLevel } from './core/Logger';
import { useNotificationStore } from './stores/useNotificationStore';
import { useRecipeStore } from './stores/useRecipeStore';
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

const { getState: getRecipeState } = useRecipeStore;
const { getState: getNotificationState } = useNotificationStore;

const BARATIE_API = {
  app: appRegistry,
  createRoot,
  error: errorHandler,
  ingredient: ingredientRegistry,
  logger,
  LogLevel,
  helpers: {
    file: {
      download: triggerDownload,
      readAsBase64,
      readAsText,
    },
    notification: {
      clear: () => {
        return getNotificationState().clear();
      },
      remove: (id: string) => {
        return getNotificationState().remove(id);
      },
      show: (message: string, type?: NotificationType, title?: string, duration?: number) => {
        return getNotificationState().show(message, type, title, duration);
      },
    },
    recipe: {
      add: (type: symbol, initialSpices?: Readonly<Record<string, unknown>>) => {
        return getRecipeState().addIngredient(type, initialSpices);
      },
      clear: () => {
        return getRecipeState().clearRecipe();
      },
      getActiveId: () => {
        return getRecipeState().getActiveRecipeId();
      },
      remove: (id: string) => {
        return getRecipeState().removeIngredient(id);
      },
      update: (id: string, spiceId: string, rawValue: SpiceValue, spice: Readonly<SpiceDefinition>) => {
        return getRecipeState().updateSpice(id, spiceId, rawValue, spice);
      },
    },
  },
} as const;

type BaratieApi = typeof BARATIE_API;

export { create, React, ReactDOM, subscribeWithSelector, v };

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

declare global {
  // eslint-disable-next-line no-var
  var Baratie: BaratieApi;
}

if (typeof globalThis !== 'undefined') {
  globalThis.Baratie = BARATIE_API;
}
