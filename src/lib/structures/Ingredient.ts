import type { IngredientContext, ResultType, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';
import type { InputType } from '../core/InputType';

export interface IngredientOptions {
  readonly name: string;
  readonly category: string;
  readonly description: string;
}

export abstract class Ingredient<T = unknown> {
  public readonly name: string;
  public readonly category: string;
  public readonly description: string;

  public constructor({ name, category, description }: Readonly<IngredientOptions>) {
    this.name = name;
    this.category = category;
    this.description = description;
  }

  public spices?(currentValues: Readonly<Record<string, SpiceValue>>): ReadonlyArray<SpiceDefinition>;
  public abstract run(input: InputType, spices: T, context: IngredientContext): ResultType | Promise<ResultType>;
}
