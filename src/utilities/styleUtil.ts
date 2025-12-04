export function cn(...inputs: unknown[]): string {
  return inputs.filter(Boolean).map(String).join(' ');
}
