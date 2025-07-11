import { logger } from '../app/container';
import { useIngredientStore } from '../stores/useIngredientStore';
import { InputType } from './InputType';

export interface Ingredient {
  readonly id: string;
  readonly name: symbol;
  readonly spices: Readonly<Record<string, unknown>>;
}

export interface RecipeBookItem {
  readonly id: string;
  readonly name: string;
  readonly ingredients: readonly Ingredient[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface IngredientContext {
  readonly cookVersion: number;
  readonly currentIndex: number;
  readonly ingredient: Ingredient;
  readonly initialInput: string;
  readonly recipe: readonly Ingredient[];
}

export type IngredientRunner<T = unknown, InType = unknown, OutType = unknown> = (
  input: InputType<InType>,
  spices: T,
  context: IngredientContext,
) => ResultType<OutType> | Promise<ResultType<OutType>>;

export interface IngredientDefinition<T = unknown, InType = unknown, OutType = unknown> {
  readonly name: symbol;
  readonly category: symbol;
  readonly description: string;
  readonly spices?: readonly SpiceDefinition[];
  readonly run: IngredientRunner<T, InType, OutType>;
  readonly extensionId?: string;
}

export interface SpiceDependency {
  readonly spiceId: string;
  readonly value: string | number | boolean | readonly (string | number | boolean)[];
}

export type SpiceDefinition = StringSpice | TextareaSpice | NumberSpice | BooleanSpice | SelectSpice;

export type InputPanelConfig =
  | { readonly mode: 'textarea'; readonly placeholder: string; readonly title: string; readonly disabled?: boolean; readonly showClear: boolean }
  | { readonly mode: 'spiceEditor'; readonly targetIngredientId: string; readonly title: string };

export type OutputPanelConfig = { readonly mode: 'textarea'; readonly title: string; readonly placeholder: string };

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

export type ResultType<OutType = unknown> = InputType<OutType> | PanelControlSignal<OutType> | null;

interface BaseSpice<SpiceType extends 'boolean' | 'number' | 'select' | 'string' | 'textarea', ValueType> {
  readonly id: string;
  readonly label: string;
  readonly type: SpiceType;
  readonly value: ValueType;
  readonly dependsOn?: readonly SpiceDependency[];
  readonly description?: string;
}

type BooleanSpice = BaseSpice<'boolean', boolean> & {
  readonly max?: never;
  readonly min?: never;
  readonly options?: never;
  readonly placeholder?: never;
  readonly step?: never;
};

type NumberSpice = BaseSpice<'number', number> & {
  readonly max?: number;
  readonly min?: number;
  readonly options?: never;
  readonly placeholder?: string;
  readonly step?: number;
};

type SelectSpice = BaseSpice<'select', boolean | number | string> & {
  readonly options: readonly { readonly label: string; readonly value: boolean | number | string }[];
  readonly max?: never;
  readonly min?: never;
  readonly placeholder?: never;
  readonly step?: never;
};

type StringSpice = BaseSpice<'string', string> & {
  readonly max?: never;
  readonly min?: never;
  readonly options?: never;
  readonly placeholder?: string;
  readonly step?: never;
};

type TextareaSpice = BaseSpice<'textarea', string> & {
  readonly max?: never;
  readonly min?: never;
  readonly options?: never;
  readonly placeholder?: string;
  readonly step?: never;
};

export class IngredientRegistry {
  private readonly ingredients: Map<symbol, IngredientDefinition> = new Map();
  private readonly stringToSymbol: Map<string, symbol> = new Map();
  private readonly symbolToString: Map<symbol, string> = new Map();

  public getAllIngredients(): readonly IngredientDefinition[] {
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

  public registerIngredient<T>(definition: IngredientDefinition<T>): void {
    if (this.ingredients.has(definition.name)) {
      logger.warn(`IngredientRegistry: Re-registering type "${String(definition.name)}", which overwrites the existing definition.`);
    }

    this.ingredients.set(definition.name, definition as IngredientDefinition);

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

    useIngredientStore.getState().refreshRegistry();
  }

  public unregisterIngredients(types: readonly symbol[]): void {
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
      useIngredientStore.getState().refreshRegistry();
    }
  }
}
