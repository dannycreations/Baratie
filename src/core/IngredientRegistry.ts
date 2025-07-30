import { errorHandler, logger } from '../app/container';
import { useIngredientStore } from '../stores/useIngredientStore';
import { getObjectHash } from '../utilities/appUtil';

import type { JSX } from 'react';
import type { InputType } from './InputType';

export type SpiceValue = string | number | boolean;

export interface IngredientItem {
  readonly id: string;
  readonly ingredientId: string;
  readonly name: string;
  readonly spices: Readonly<Record<string, SpiceValue>>;
}

export interface IngredientContext {
  readonly currentIndex: number;
  readonly initialInput: string;
  readonly ingredient: IngredientItem;
  readonly recipe: ReadonlyArray<IngredientItem>;
}

export interface IngredientDefinition<T = unknown> {
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly spices?: ReadonlyArray<SpiceDefinition>;
  readonly run: (input: InputType, spices: T, context: IngredientContext) => InputType | Promise<InputType>;
}

export interface IngredientProps<T = unknown> extends IngredientDefinition<T> {
  readonly id: string;
}

interface PanelBaseConfig {
  readonly title: string;
}

interface PanelTextareaConfig extends PanelBaseConfig {
  readonly mode: 'textarea';
  readonly placeholder: string;
}

interface PanelCustomConfig extends PanelBaseConfig {
  readonly mode: 'custom';
  readonly render: () => JSX.Element;
}

export type OutputPanelConfig = PanelTextareaConfig | PanelCustomConfig;

interface InputPanelTextareaConfig extends PanelTextareaConfig {
  readonly disabled?: boolean;
  readonly showClear: boolean;
}

interface InputPanelSpiceEditorConfig extends PanelBaseConfig {
  readonly mode: 'spiceEditor';
  readonly targetIngredientId: string;
}

export type InputPanelConfig = InputPanelTextareaConfig | InputPanelSpiceEditorConfig | PanelCustomConfig;

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

export interface RecipebookItem {
  readonly id: string;
  readonly name: string;
  readonly ingredients: ReadonlyArray<IngredientItem>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

interface BaseSpice<SpiceType extends 'boolean' | 'number' | 'select' | 'string' | 'textarea', ValueType> {
  readonly id: string;
  readonly label: string;
  readonly type: SpiceType;
  readonly value: ValueType;
  readonly description?: string;
  readonly placeholder?: string;
  readonly dependsOn?: ReadonlyArray<{
    readonly spiceId: string;
    readonly value: SpiceValue | ReadonlyArray<SpiceValue>;
  }>;
}

type BooleanSpice = Omit<BaseSpice<'boolean', boolean>, 'placeholder'>;

interface NumberSpice extends BaseSpice<'number', number> {
  readonly max?: number;
  readonly min?: number;
  readonly step?: number;
}

type SelectSpice = Omit<BaseSpice<'select', SpiceValue>, 'placeholder'> & {
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: SpiceValue;
  }>;
};

type StringSpice = BaseSpice<'string' | 'textarea', string>;

export type SpiceDefinition = StringSpice | NumberSpice | BooleanSpice | SelectSpice;

export class IngredientRegistry {
  private ingredients: Map<string, IngredientProps> = new Map();
  private nameToIdMap: Map<string, string> = new Map();
  private categories: ReadonlySet<string> | null = null;
  private isBatching = false;

  public startBatch(): void {
    this.isBatching = true;
  }

  public endBatch(): void {
    this.isBatching = false;
    this.resort();
  }

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

  public getAllIngredients(): ReadonlyArray<IngredientProps> {
    return Array.from(this.ingredients.values());
  }

  public getIngredient(id: string): IngredientProps | undefined {
    return this.ingredients.get(id);
  }

  public getIngredientByName(name: string): IngredientProps | undefined {
    const id = this.nameToIdMap.get(name);
    return id ? this.ingredients.get(id) : undefined;
  }

  public registerIngredient<T>(definition: IngredientDefinition<T>, namespace?: string): string {
    const { run, ...restOfDefinition } = definition;
    const id = getObjectHash(restOfDefinition, namespace);

    errorHandler.assert(typeof id === 'string' && id.length > 0, `Ingredient definition "${definition.name}" failed to generate a valid ID.`);

    if (this.ingredients.has(id)) {
      logger.warn(
        `IngredientRegistry: Re-registering type with generated ID "${id}" (${definition.name}), which overwrites the existing definition.`,
      );
    }

    this.ingredients.set(id, { ...definition, id } as IngredientProps);
    if (!this.isBatching) {
      this.resort();
    }
    return id;
  }

  public unregisterIngredients(ids: ReadonlyArray<string>): void {
    let changed = false;
    for (const id of ids) {
      if (this.ingredients.delete(id)) {
        changed = true;
        logger.info(`Unregistered ingredient: ${id}`);
      }
    }
    if (changed && !this.isBatching) {
      this.resort();
    }
  }

  private resort(): void {
    const sortedEntries = Array.from(this.ingredients.entries()).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    this.ingredients = new Map(sortedEntries);
    this.nameToIdMap = new Map(sortedEntries.map(([id, ingredient]) => [ingredient.name, id]));
    this.categories = null;
    useIngredientStore.getState().refreshRegistry();
  }
}
