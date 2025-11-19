export function cn(...inputs: unknown[]): string {
  let result = '';
  for (let i = 0; i < inputs.length; i++) {
    const val = inputs[i];
    if (val) {
      const str = String(val);
      if (str) {
        if (result) result += ' ';
        result += str;
      }
    }
  }
  return result;
}
