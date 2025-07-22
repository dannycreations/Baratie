import { logger } from '../app/container';
import { useIngredientStore } from '../stores/useIngredientStore';

import type { InputType } from './InputType';

export type SpiceValue = string | number | boolean;

export interface Ingredient {
  readonly id: string;
  readonly name: string;
  readonly spices: Readonly<Record<string, SpiceValue>>;
}

export interface IngredientContext {
  readonly currentIndex: number;
  readonly ingredient: Ingredient;
  readonly initialInput: string;
  readonly recipe: ReadonlyArray<Ingredient>;
}

export interface IngredientDefinition<T = unknown> {
  readonly name: string;
  readonly category: string;
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
  private readonly ingredients: Map<string, IngredientDefinition> = new Map();
  private categories: ReadonlySet<string> | null = null;

  public getAllCategories(): ReadonlySet<string> {
    if (this.categories) {
      return this.categories;
    }
    const categorySet = new Set<string>();
    for (const ingredient of this.ingredients.values()) {
      categorySet.add(ingredient.category);
    }
    this.categories = categorySet;
    return this.categories;
  }

  public getAllIngredients(): ReadonlyArray<IngredientDefinition> {
    return Array.from(this.ingredients.values());
  }

  public getIngredient(type: string): IngredientDefinition | undefined {
    return this.ingredients.get(type);
  }

  public registerIngredient<T>(definition: IngredientDefinition<T>): void {
    if (this.ingredients.has(definition.name)) {
      logger.warn(`IngredientRegistry: Re-registering type "${definition.name}", which overwrites the existing definition.`);
    }

    this.ingredients.set(definition.name, definition as IngredientDefinition);
    this.categories = null;
    useIngredientStore.getState().refreshRegistry();
  }

  public unregisterIngredients(types: ReadonlyArray<string>): void {
    let changed = false;
    for (const type of types) {
      if (this.ingredients.delete(type)) {
        changed = true;
        logger.info(`Unregistered ingredient: ${type}`);
      }
    }
    if (changed) {
      this.categories = null;
      useIngredientStore.getState().refreshRegistry();
    }
  }
}
