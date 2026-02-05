import React from 'react';
import ReactDOM from 'react-dom/client';
import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './app/Baratie';
import { errorHandler, ingredientRegistry, logger, taskRegistry } from './app/container';
import { LogLevel } from './core/Logger';
import { useNotificationStore } from './stores/useNotificationStore';
import { useRecipeStore } from './stores/useRecipeStore';
import { useThemeStore } from './stores/useThemeStore';

import type { BaratieOptions } from './app/Baratie';
import type { NotificationType } from './app/types';
import type { IngredientContext, IngredientDefinition, IngredientItem, RecipebookItem, SpiceDefinition, SpiceValue } from './core/IngredientRegistry';
import type { InputType } from './core/InputType';

const getNotificationState = useNotificationStore.getState;
const getRecipeState = useRecipeStore.getState;

const BARATIE_API = {
  LogLevel,
  logger,
  createRoot,
  task: taskRegistry,
  error: errorHandler,
  ingredient: ingredientRegistry,
  helpers: {
    notification: {
      clear: () => getNotificationState().clear(),
      remove: (id: string) => getNotificationState().remove(id),
      show: (message: string, type?: NotificationType, title?: string, duration?: number) => {
        return getNotificationState().show(message, type, title, duration);
      },
    },
    recipe: {
      add: (ingredientId: string, initialSpices?: Readonly<Record<string, unknown>>) => {
        return getRecipeState().addIngredient(ingredientId, initialSpices);
      },
      clear: () => getRecipeState().clearRecipe(),
      getActiveId: () => getRecipeState().getActiveRecipeId(),
      remove: (id: string) => getRecipeState().removeIngredient(id),
      update: (id: string, spiceId: string, rawValue: SpiceValue) => {
        return getRecipeState().updateSpice(id, spiceId, rawValue);
      },
    },
    theme: {
      get: () => useThemeStore((state) => state.id),
    },
  },
} as const;

export { create, React, ReactDOM, subscribeWithSelector, v };

export type {
  BaratieApi,
  BaratieOptions,
  IngredientContext,
  IngredientDefinition,
  IngredientItem,
  InputType,
  NotificationType,
  RecipebookItem,
  SpiceDefinition,
  SpiceValue,
};

type BaratieApi = typeof BARATIE_API;

declare global {
  // eslint-disable-next-line no-var
  var Baratie: BaratieApi;
}

if (typeof globalThis !== 'undefined') {
  globalThis.Baratie = BARATIE_API;
}
