export function cn(...inputs: unknown[]): string {
  let result = '';
  for (let i = 0; i < inputs.length; i++) {
    const val = inputs[i];
    if (typeof val === 'string') {
      if (val) {
        result = result ? result + ' ' + val : val;
      }
    } else if (val) {
      result = result ? result + ' ' + val : String(val);
    }
  }
  return result;
}
