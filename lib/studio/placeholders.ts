export const BLOCKED_MARKERS: Array<[string, string]> = [
  ['yourname', '社交账号占位符'],
  ['your-wechat-id', '微信号占位符'],
  ['hello@example.com', '邮箱占位符'],
  ['你的名字', '姓名占位符'],
  ['your name', '姓名占位符'],
  ['你的职业', '职业占位符'],
  ['your role', '职业占位符'],
  ['你的城市', '城市占位符'],
  ['your city', '城市占位符'],
  ['林小满', '模板示例姓名'],
  ['momo lin', '模板示例姓名'],
  ['阿哲phil', '个人示例姓名'],
  ['formulasearch', '模板作者品牌'],
  ['folio-studio', '旧模板品牌'],
  ['alex morgan', '模板示例姓名'],
];

export function findPlaceholderHits(text: string): Array<{ marker: string; label: string }> {
  const lower = String(text || '').toLowerCase();
  const hits: Array<{ marker: string; label: string }> = [];
  for (const [marker, label] of BLOCKED_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      hits.push({ marker, label });
    }
  }
  return hits;
}

export function collectTextValues(value: unknown, bag: string[] = []): string[] {
  if (typeof value === 'string') {
    bag.push(value);
    return bag;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, bag));
    return bag;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectTextValues(item, bag));
  }
  return bag;
}
