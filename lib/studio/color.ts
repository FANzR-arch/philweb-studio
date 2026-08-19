export function hexToRgb(hex: string): [number, number, number] | null {
  const match = String(hex || '').trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function tintToHex(value: unknown): string {
  const match = /rgba\((\d+),\s*(\d+),\s*(\d+)/.exec(String(value ?? ''));
  if (!match) {
    const raw = String(value ?? '').trim();
    return hexToRgb(raw) ? raw.toUpperCase() : '';
  }
  const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`.toUpperCase();
}

export function isHexColor(value: string): boolean {
  return Boolean(hexToRgb(value));
}
