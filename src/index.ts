import React from 'react';
import ReactDOM from 'react-dom/client';
import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createRoot } from './app/Baratie';
import { appRegistry, errorHandler, eventSystem, ingredientRegistry, logger } from './app/container';
import { Ingredient } from './core/Ingredient';
import { LogLevel } from './core/Logger';

import type { BaratieOptions } from './app/Baratie';
import type { AppEvents } from './app/events';
import type { IngredientOptions } from './core/Ingredient';
import type { IngredientContext, IngredientItem, RecipeBookItem, ResultType, SpiceDefinition, SpiceValue } from './core/IngredientRegistry';
import type { InputType } from './core/InputType';

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
