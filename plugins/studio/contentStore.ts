/**
 * [INPUT]   : content/ 目录下的 YAML / Markdown frontmatter / 主题 JSON 文件
 * [OUTPUT]  : Studio 定制器读写内容文件所需的解析与安全改写工具
 * [POS]     : Studio 插件的数据层，只做"定点读 / 定点改"，不重排用户文件
 * [DECISION]: 不引入 YAML 依赖，复用 content-system 的引号与缩进约定，按路径做行级替换，
 *             保证改写结果始终能被 content-system/core.js 的严格解析器接受
 */

import fs from 'fs';
import path from 'path';

export interface FrontmatterDoc {
  frontmatter: string;
  body: string;
}

const INDENT_STEP = 2;

const getIndent = (line: string): number => line.match(/^ */)![0].length;

const isMeaningful = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.length > 0 && !trimmed.startsWith('#');
};

/** 与 content-system/core.js 的 unquoteScalar 保持一致的取值逻辑。 */
export const unquoteScalar = (rawValue: string): string => {
  const value = rawValue.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  if (value.startsWith('\'') && value.endsWith('\'') && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, '\'');
  }
  return value;
};

/** 输出双引号标量，转义规则与 core.js 的解析器互逆。 */
export const quoteScalar = (value: string): string =>
  `"${value.replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;

/** 拆分 markdown frontmatter；文件必须以 --- 开头（与 core.js splitFrontmatter 同约定）。 */
export function splitFrontmatterDoc(rawContent: string): FrontmatterDoc | null {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n?)([\s\S]*)$/);
  if (!match) {
    return null;
  }
  return { frontmatter: match[1], body: match[3] };
}

export function joinFrontmatterDoc(doc: FrontmatterDoc): string {
  return `---\n${doc.frontmatter}\n---\n${doc.body}`;
}

/**
 * 在 YAML 文本里定位嵌套标量所在的行号。
 * 只支持 map 嵌套（2 空格缩进），不进入数组 —— Studio 编辑的字段都满足该约束。
 */
function findScalarLineIndex(lines: string[], keyPath: string[]): number {
  let searchFrom = 0;
  let blockEnd = lines.length;

  for (let depth = 0; depth < keyPath.length; depth += 1) {
    const key = keyPath[depth];
    const indent = depth * INDENT_STEP;
    let foundIndex = -1;

    for (let i = searchFrom; i < blockEnd; i += 1) {
      const line = lines[i];
      if (!isMeaningful(line)) continue;
      const currentIndent = getIndent(line);
      if (currentIndent < indent) break;
      if (currentIndent !== indent) continue;
      const trimmed = line.trim();
      if (trimmed === `${key}:` || trimmed.startsWith(`${key}: `)) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      return -1;
    }
    if (depth === keyPath.length - 1) {
      return foundIndex;
    }

    searchFrom = foundIndex + 1;
    for (let i = searchFrom; i <= blockEnd; i += 1) {
      if (i === blockEnd || (isMeaningful(lines[i]) && getIndent(lines[i]) <= indent)) {
        blockEnd = i;
        break;
      }
    }
  }

  return -1;
}

/** 把 YAML 文本中指定路径的标量替换为新值；找不到路径时返回 null。 */
export function patchYamlScalar(
  yamlText: string,
  keyPath: string[],
  value: string | number | boolean,
): string | null {
  const lines = yamlText.split('\n');
  const index = findScalarLineIndex(lines, keyPath);
  if (index === -1) {
    return null;
  }

  const indent = ' '.repeat((keyPath.length - 1) * INDENT_STEP);
  const key = keyPath[keyPath.length - 1];
  const rendered = typeof value === 'string' ? quoteScalar(value) : String(value);
  lines[index] = `${indent}${key}: ${rendered}`;
  return lines.join('\n');
}

/**
 * 把 YAML 文本中指定路径替换为字符串数组。
 * 支持原值为 `key: []` 单行或 `key:` + 缩进条目两种形态。
 */
export function patchYamlStringArray(
  yamlText: string,
  keyPath: string[],
  values: string[],
): string | null {
  const lines = yamlText.split('\n');
  const index = findScalarLineIndex(lines, keyPath);
  if (index === -1) {
    return null;
  }

  const indent = (keyPath.length - 1) * INDENT_STEP;
  const indentText = ' '.repeat(indent);
  const key = keyPath[keyPath.length - 1];

  // 数组条目位于 key 行之后、缩进更深的连续区段（含空行/注释行）。
  let end = index + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (isMeaningful(line) && getIndent(line) <= indent) break;
    end += 1;
  }
  // 区段尾部的空行还给外层，避免吞掉文件原有的空行分隔。
  while (end > index + 1 && lines[end - 1].trim() === '') {
    end -= 1;
  }

  const replacement = values.length === 0
    ? [`${indentText}${key}: []`]
    : [`${indentText}${key}:`, ...values.map((item) => `${indentText}  - ${quoteScalar(item)}`)];

  lines.splice(index, end - index, ...replacement);
  return lines.join('\n');
}

/**
 * 读取 YAML 文本中指定路径下的"对象数组"（如 timeline.items）。
 * 支持条目为扁平 map，字段值为标量或一层字符串数组。
 */
export function readYamlObjectArray(
  yamlText: string,
  keyPath: string[],
): Array<Record<string, string | string[]>> {
  const lines = yamlText.split('\n');
  const index = findScalarLineIndex(lines, keyPath);
  if (index === -1) return [];

  const keyIndent = (keyPath.length - 1) * INDENT_STEP;
  const itemIndent = keyIndent + INDENT_STEP;
  const items: Array<Record<string, string | string[]>> = [];
  let current: Record<string, string | string[]> | null = null;
  let currentArrayKey: string | null = null;

  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isMeaningful(line)) continue;
    const indent = getIndent(line);
    if (indent <= keyIndent) break;
    const trimmed = line.trim();

    if (indent === itemIndent && trimmed.startsWith('- ')) {
      current = {};
      currentArrayKey = null;
      items.push(current);
      const rest = trimmed.slice(2);
      const match = rest.match(/^([^:\s][^:]*):(.*)$/);
      if (match) {
        current[match[1].trim()] = unquoteScalar(match[2].trim());
      }
      continue;
    }
    if (!current) continue;

    if (trimmed.startsWith('- ') && currentArrayKey) {
      (current[currentArrayKey] as string[]).push(unquoteScalar(trimmed.slice(2)));
      continue;
    }

    const match = trimmed.match(/^([^:\s][^:]*):(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rest = match[2].trim();
    if (rest && rest !== '[]') {
      current[key] = unquoteScalar(rest);
      currentArrayKey = null;
    } else if (rest === '[]') {
      current[key] = [];
      currentArrayKey = null;
    } else {
      current[key] = [];
      currentArrayKey = key;
    }
  }

  return items;
}

/**
 * 把 YAML 文本中指定路径替换为"对象数组"块。
 * keyOrder 控制每个条目内字段的输出顺序；字符串数组字段渲染为嵌套列表。
 */
export function patchYamlObjectArray(
  yamlText: string,
  keyPath: string[],
  items: Array<Record<string, string | string[]>>,
  keyOrder: string[],
): string | null {
  const lines = yamlText.split('\n');
  const index = findScalarLineIndex(lines, keyPath);
  if (index === -1) return null;

  const keyIndent = (keyPath.length - 1) * INDENT_STEP;
  const indentText = ' '.repeat(keyIndent);
  const key = keyPath[keyPath.length - 1];

  let end = index + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (isMeaningful(line) && getIndent(line) <= keyIndent) break;
    end += 1;
  }
  while (end > index + 1 && lines[end - 1].trim() === '') {
    end -= 1;
  }

  const replacement: string[] = [];
  if (items.length === 0) {
    replacement.push(`${indentText}${key}: []`);
  } else {
    replacement.push(`${indentText}${key}:`);
    for (const item of items) {
      let first = true;
      for (const fieldKey of keyOrder) {
        const value = item[fieldKey];
        if (value === undefined) continue;
        const fieldIndent = first ? `${indentText}  - ` : `${indentText}    `;
        if (Array.isArray(value)) {
          if (value.length === 0) {
            replacement.push(`${fieldIndent}${fieldKey}: []`);
          } else {
            replacement.push(`${fieldIndent}${fieldKey}:`);
            for (const entry of value) {
              replacement.push(`${indentText}      - ${quoteScalar(entry)}`);
            }
          }
        } else {
          replacement.push(`${fieldIndent}${fieldKey}: ${quoteScalar(value)}`);
        }
        first = false;
      }
    }
  }

  lines.splice(index, end - index, ...replacement);
  return lines.join('\n');
}

/** 读取 YAML 文本中所有 map 嵌套下的标量，返回 `a.b.c` 形式的扁平字典（数组条目忽略）。 */
export function readYamlScalars(yamlText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const stack: string[] = [];

  for (const rawLine of yamlText.split('\n')) {
    if (!isMeaningful(rawLine)) continue;
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('- ')) continue;
    const indent = getIndent(rawLine);
    if (indent % INDENT_STEP !== 0) continue;

    const depth = indent / INDENT_STEP;
    const match = trimmed.match(/^([^:\s][^:]*):(.*)$/);
    if (!match) continue;

    stack.length = depth;
    stack[depth] = match[1].trim();
    const rest = match[2].trim();
    if (rest && rest !== '[]' && rest !== '{}') {
      result[stack.slice(0, depth + 1).join('.')] = unquoteScalar(rest);
    }
  }

  return result;
}

/** 读取 YAML 文本中指定路径下的字符串数组（仅一层 `- "item"` 条目）。 */
export function readYamlStringArray(yamlText: string, keyPath: string[]): string[] {
  const lines = yamlText.split('\n');
  const index = findScalarLineIndex(lines, keyPath);
  if (index === -1) {
    return [];
  }

  const indent = (keyPath.length - 1) * INDENT_STEP;
  const items: string[] = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isMeaningful(line)) continue;
    if (getIndent(line) <= indent) break;
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      items.push(unquoteScalar(trimmed.slice(2)));
    }
  }
  return items;
}

export const readTextFile = (filePath: string): string =>
  fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');

export const writeTextFile = (filePath: string, content: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
};

/** 对 frontmatter 文件应用一组"定点改写"，任何一处路径缺失都会抛错并放弃写入。 */
export function patchFrontmatterFile(
  filePath: string,
  apply: (frontmatter: string) => string,
): void {
  const raw = readTextFile(filePath);
  const doc = splitFrontmatterDoc(raw);
  if (!doc) {
    throw new Error(`${filePath} 缺少 frontmatter，无法定点改写。`);
  }
  writeTextFile(filePath, joinFrontmatterDoc({ ...doc, frontmatter: apply(doc.frontmatter) }));
}

/** patchYamlScalar 的抛错版本，用于必须成功的改写。 */
export function mustPatchScalar(
  yamlText: string,
  keyPath: string[],
  value: string | number | boolean,
  label: string,
): string {
  const next = patchYamlScalar(yamlText, keyPath, value);
  if (next === null) {
    throw new Error(`在 ${label} 中找不到字段 ${keyPath.join('.')}`);
  }
  return next;
}

export function mustPatchStringArray(
  yamlText: string,
  keyPath: string[],
  values: string[],
  label: string,
): string {
  const next = patchYamlStringArray(yamlText, keyPath, values);
  if (next === null) {
    throw new Error(`在 ${label} 中找不到字段 ${keyPath.join('.')}`);
  }
  return next;
}
