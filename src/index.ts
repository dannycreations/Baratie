import React from 'react';
import ReactDOM from 'react-dom/client';
import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './lib/app/Baratie';
import { appRegistry, errorHandler, eventSystem, ingredientRegistry, logger } from './lib/app/container';
import { LogLevel } from './lib/core/Logger';
import { Ingredient } from './lib/structures/Ingredient';

import type { BaratieOptions } from './lib/app/Baratie';
import type { AppEvents } from './lib/app/events';
import type { IngredientContext, IngredientItem, RecipeBookItem, ResultType, SpiceDefinition, SpiceValue } from './lib/core/IngredientRegistry';
import type { InputType } from './lib/core/InputType';
import type { IngredientOptions } from './lib/structures/Ingredient';

const BARATIE_API = {
  logger,
  LogLevel,
  createRoot,
  app: appRegistry,
  error: errorHandler,
  events: eventSystem,
  ingredient: ingredientRegistry,
} as const;

type BaratieApi = typeof BARATIE_API;

export { create, Ingredient, React, ReactDOM, subscribeWithSelector, v };

export type {
  AppEvents,
  BaratieApi,
  BaratieOptions,
  IngredientContext,
  IngredientItem,
  IngredientOptions,
  InputType,
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
