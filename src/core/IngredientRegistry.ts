import { logger } from '../app/container';
import { useIngredientStore } from '../stores/useIngredientStore';

import type { InputType } from './InputType';

export type SpiceValue = string | number | boolean;

export interface Ingredient {
  readonly id: string;
  readonly name: symbol;
  readonly spices: Readonly<Record<string, SpiceValue>>;
}

export interface IngredientContext {
  readonly currentIndex: number;
  readonly ingredient: Ingredient;
  readonly initialInput: string;
  readonly recipe: ReadonlyArray<Ingredient>;
}

export interface IngredientDefinition<T = unknown> {
  readonly name: symbol;
  readonly category: symbol;
  readonly description: string;
  readonly spices?: ReadonlyArray<SpiceDefinition>;
  readonly run: (input: InputType, spices: T, context: IngredientContext) => ResultType | Promise<ResultType>;
  readonly extensionId?: string;
}

export type InputPanelConfig =
  | {
      readonly mode: 'textarea';
      readonly placeholder: string;
      readonly title: string;
      readonly disabled?: boolean;
      readonly showClear: boolean;
    }
  | {
      readonly mode: 'spiceEditor';
      readonly targetIngredientId: string;
      readonly title: string;
    };

export type OutputPanelConfig = {
  readonly mode: 'textarea';
  readonly title: string;
  readonly placeholder: string;
};

export type PanelControlConfig =
  | {
      readonly panelType: 'input';
      readonly providerId: string;
      readonly config: InputPanelConfig;
    }
  | {
      readonly panelType: 'output';
      readonly providerId: string;
      readonly config: OutputPanelConfig;
    };

export interface PanelControlSignal<OutType = unknown> {
  readonly output: InputType<OutType>;
  readonly panelControl?: PanelControlConfig;
}

export interface RecipeBookItem {
  readonly id: string;
  readonly name: string;
  readonly ingredients: ReadonlyArray<Ingredient>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type ResultType = InputType | PanelControlSignal | null;

interface BaseSpice<SpiceType extends 'boolean' | 'number' | 'select' | 'string' | 'textarea', ValueType> {
  readonly id: string;
  readonly label: string;
  readonly type: SpiceType;
  readonly value: ValueType;
  readonly description?: string;
  readonly dependsOn?: ReadonlyArray<{
    readonly spiceId: string;
    readonly value: SpiceValue | ReadonlyArray<SpiceValue>;
  }>;
}

type BooleanSpice = BaseSpice<'boolean', boolean>;

type NumberSpice = BaseSpice<'number', number> & {
  readonly max?: number;
  readonly min?: number;
  readonly step?: number;
  readonly placeholder?: string;
};

type SelectSpice = BaseSpice<'select', SpiceValue> & {
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: SpiceValue;
  }>;
};

type StringSpice = BaseSpice<'string' | 'textarea', string> & {
  readonly placeholder?: string;
};

export type SpiceDefinition = StringSpice | NumberSpice | BooleanSpice | SelectSpice;

export class IngredientRegistry {
  private readonly ingredients: Map<symbol, IngredientDefinition> = new Map();
  private readonly stringToSymbol: Map<string, symbol> = new Map();
  private readonly symbolToString: Map<symbol, string> = new Map();
  private categories: ReadonlyMap<string, symbol> | null = null;

  public getAllCategories(): ReadonlyMap<string, symbol> {
    if (this.categories) {
      return this.categories;
    }
    const categoryMap = new Map<string, symbol>();
    for (const ingredient of this.ingredients.values()) {
      const description = ingredient.category.description;
      if (description && !categoryMap.has(description)) {
        categoryMap.set(description, ingredient.category);
      }
    }
    this.categories = categoryMap;
    return this.categories;
  }

  public getAllIngredients(): ReadonlyArray<IngredientDefinition> {
    return Array.from(this.ingredients.values());
  }

  public getIngredient(type: symbol): IngredientDefinition | undefined {
    return this.ingredients.get(type);
  }

  public getStringFromSymbol(typeSymbol: symbol): string | undefined {
    return this.symbolToString.get(typeSymbol);
  }

  public getSymbolFromString(typeString: string): symbol | undefined {
    return this.stringToSymbol.get(typeString);
  }

  public registerIngredient(definition: IngredientDefinition): void {
    if (this.ingredients.has(definition.name)) {
      logger.warn(`IngredientRegistry: Re-registering type "${String(definition.name)}", which overwrites the existing definition.`);
    }

    this.ingredients.set(definition.name, definition);

    const typeString = definition.name.description?.trim();
    if (typeString) {
      if (this.stringToSymbol.has(typeString) && this.stringToSymbol.get(typeString) !== definition.name) {
        logger.warn(
          `IngredientRegistry: The type string "${typeString}" is already registered with a different symbol instance. This can cause serialization conflicts.`,
        );
      }
      this.symbolToString.set(definition.name, typeString);
      this.stringToSymbol.set(typeString, definition.name);
    } else {
      logger.warn('IngredientRegistry: An ingredient was registered without a description on its name symbol, which is required for serialization.', {
        name: definition.name,
      });
    }

    this.categories = null;
    useIngredientStore.getState().refreshRegistry();
  }

  public unregisterIngredients(types: ReadonlyArray<symbol>): void {
    let changed = false;
    for (const type of types) {
      if (this.ingredients.has(type)) {
        this.ingredients.delete(type);
        const typeString = this.symbolToString.get(type);
        if (typeString) {
          this.symbolToString.delete(type);
          this.stringToSymbol.delete(typeString);
        }
        changed = true;
        logger.info(`Unregistered ingredient: ${String(type)}`);
      }
    }
    if (changed) {
      this.categories = null;
      useIngredientStore.getState().refreshRegistry();
    }
  }
}
