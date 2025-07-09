import { logger } from '../app/container';
import { InputType } from './InputType';

export interface Ingredient {
  readonly id: symbol;
  readonly instanceId: string;
  readonly name: string;
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
  readonly id: symbol;
  readonly name: string;
  readonly category: symbol;
  readonly description: string;
  readonly run: IngredientRunner<T, InType, OutType>;
  readonly spices?: readonly SpiceDefinition[];
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
      readonly providerOpId: string;
      readonly config: InputPanelConfig;
    }
  | {
      readonly panelType: 'output';
      readonly providerOpId: string;
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
  private readonly typeStringToSymbol: Map<string, symbol> = new Map();
  private readonly typeSymbolToString: Map<symbol, string> = new Map();

  public getAllIngredients(): readonly IngredientDefinition[] {
    return Array.from(this.ingredients.values());
  }

  public getIngredient(type: symbol): IngredientDefinition | undefined {
    return this.ingredients.get(type);
  }

  public getStringFromSymbol(typeSymbol: symbol): string | undefined {
    return this.typeSymbolToString.get(typeSymbol);
  }

  public getSymbolFromString(typeString: string): symbol | undefined {
    return this.typeStringToSymbol.get(typeString);
  }

  public registerIngredient<T>(definition: IngredientDefinition<T>): void {
    if (this.ingredients.has(definition.id)) {
      logger.warn(`IngredientRegistry: Re-registering type "${String(definition.id)}", which overwrites the existing definition.`);
    }

    this.ingredients.set(definition.id, definition as IngredientDefinition);

    const typeString = definition.id.description?.trim();
    if (typeString) {
      if (this.typeStringToSymbol.has(typeString) && this.typeStringToSymbol.get(typeString) !== definition.id) {
        logger.warn(
          `IngredientRegistry: The type string "${typeString}" is already registered with a different symbol instance. This can cause serialization conflicts.`,
        );
      }
      this.typeSymbolToString.set(definition.id, typeString);
      this.typeStringToSymbol.set(typeString, definition.id);
    } else {
      logger.warn('IngredientRegistry: An ingredient was registered without a description on its symbol ID, which is required for serialization.', {
        id: definition.id,
        name: definition.name,
      });
    }
  }
}
