import fs from 'fs';
import path from 'path';

const VALID_LANGUAGES = ['zh', 'en'];
const VALID_STATUS_TONES = new Set(['live', 'beta', 'stable', 'progress']);
const GENERATED_FILE_RELATIVE_PATH = 'data/content.generated.ts';
const CONTENT_ROOT_NAME = 'content';
const CONTENT_TEXT_ROOT_NAME = 'text';
const CONTENT_MEDIA_ROOT_NAME = 'media';
const ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.pdf', '.avif']);

const normalizeSlashes = (value) => value.replace(/\\/g, '/');
const stripBom = (value) => value.replace(/^\uFEFF/, '');
const ensureTrailingNewline = (value) => (value.endsWith('\n') ? value : `${value}\n`);
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isQuoted = (value) =>
  (value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''));

function contentError(message) {
  return new Error(`[content] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw contentError(message);
  }
}

function readTextFile(filePath) {
  return stripBom(fs.readFileSync(filePath, 'utf8'));
}

function getMeaningfulLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    return {
      index,
      line: lines[index],
      indent: lines[index].match(/^ */)?.[0].length ?? 0,
    };
  }

  return null;
}

function unquoteScalar(rawValue) {
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    return rawValue.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }

  if (rawValue.startsWith('\'') && rawValue.endsWith('\'')) {
    return rawValue.slice(1, -1).replace(/''/g, '\'');
  }

  return rawValue;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value === '[]') return [];
  if (value === '{}') return {};
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (isQuoted(value)) return unquoteScalar(value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  return value;
}

function parseYaml(yamlText, filePath) {
  const lines = yamlText.replace(/\r\n?/g, '\n').split('\n');
  let index = 0;

  const parseBlock = (indent) => {
    let mode = null;
    const map = {};
    const array = [];

    while (index < lines.length) {
      const rawLine = lines[index];
      const trimmed = rawLine.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        index += 1;
        continue;
      }

      const currentIndent = rawLine.match(/^ */)?.[0].length ?? 0;
      if (currentIndent < indent) {
        break;
      }

      if (currentIndent > indent) {
        throw contentError(`${normalizeSlashes(filePath)} line ${index + 1}: unexpected indentation.`);
      }

      const line = rawLine.slice(indent);

      if (line === '-' || line.startsWith('- ')) {
        if (mode === null) {
          mode = 'array';
        }

        if (mode !== 'array') {
          throw contentError(`${normalizeSlashes(filePath)} line ${index + 1}: mixed map and array values are not supported.`);
        }

        const itemText = line === '-' ? '' : line.slice(2).trim();
        index += 1;

        if (!itemText) {
          array.push(parseBlock(indent + 2));
          continue;
        }

        const inlineMatch = itemText.match(/^([^:#][^:]*):(.*)$/);
        if (inlineMatch) {
          const item = {};
          const key = inlineMatch[1].trim();
          const rest = inlineMatch[2].trim();
          item[key] = rest ? parseScalar(rest) : null;

          const nextLine = getMeaningfulLine(lines, index);
          if (nextLine && nextLine.indent > indent) {
            const nested = parseBlock(indent + 2);
            assert(isPlainObject(nested), `${normalizeSlashes(filePath)} line ${index + 1}: array item maps must stay object-shaped.`);
            Object.assign(item, nested);
          }

          array.push(item);
          continue;
        }

        array.push(parseScalar(itemText));
        continue;
      }

      if (mode === null) {
        mode = 'map';
      }

      if (mode !== 'map') {
        throw contentError(`${normalizeSlashes(filePath)} line ${index + 1}: mixed array and map values are not supported.`);
      }

      const match = line.match(/^([^:#][^:]*):(.*)$/);
      if (!match) {
        throw contentError(`${normalizeSlashes(filePath)} line ${index + 1}: invalid YAML entry "${line}".`);
      }

      const key = match[1].trim();
      const rest = match[2].trim();
      index += 1;

      if (!rest) {
        const nextLine = getMeaningfulLine(lines, index);
        map[key] = nextLine && nextLine.indent > indent ? parseBlock(indent + 2) : null;
        continue;
      }

      map[key] = parseScalar(rest);
    }

    return mode === 'array' ? array : map;
  };

  const result = parseBlock(0);
  return isPlainObject(result) ? result : {};
}

function splitFrontmatter(rawContent) {
  const content = rawContent.replace(/\r\n?/g, '\n');
  if (!content.startsWith('---\n')) {
    return {
      data: {},
      body: content.trim(),
    };
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    throw contentError('Markdown frontmatter is missing a closing "---" delimiter.');
  }

  return {
    data: parseYaml(content.slice(4, endIndex), 'frontmatter'),
    body: content.slice(endIndex + 5).trim(),
  };
}

function readYamlFile(filePath) {
  return parseYaml(readTextFile(filePath), filePath);
}

function readMarkdownFile(filePath) {
  const { data, body } = splitFrontmatter(readTextFile(filePath));
  return {
    data,
    body,
  };
}

function assertString(value, message) {
  assert(typeof value === 'string' && value.trim().length > 0, message);
  return value;
}

function assertStringAllowEmpty(value, message) {
  assert(typeof value === 'string', message);
  return value;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function optionalBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function ensureArray(value, message) {
  assert(Array.isArray(value), message);
  return value;
}

function ensureObject(value, message) {
  assert(isPlainObject(value), message);
  return value;
}

function ensureLanguageMap(value, baseMessage) {
  const data = ensureObject(value, baseMessage);
  for (const lang of VALID_LANGUAGES) {
    assert(typeof data[lang] === 'string' && data[lang].trim().length > 0, `${baseMessage} Missing "${lang}" text.`);
  }
  return data;
}

function createAssetRef(projectRoot, sourceFilePath, rawValue) {
  const relativeValue = optionalString(rawValue);
  if (!relativeValue) {
    return undefined;
  }

  if (/^(https?:\/\/|mailto:)/.test(relativeValue)) {
    return relativeValue;
  }

  const absolutePath = path.resolve(path.dirname(sourceFilePath), relativeValue);
  const relativeToProject = normalizeSlashes(path.relative(projectRoot, absolutePath));
  assert(relativeToProject.startsWith(`${CONTENT_ROOT_NAME}/`), `${normalizeSlashes(sourceFilePath)} references an asset outside content/: ${relativeValue}`);
  assert(fs.existsSync(absolutePath), `${normalizeSlashes(sourceFilePath)} references a missing asset: ${relativeValue}`);
  assert(ASSET_EXTENSIONS.has(path.extname(absolutePath).toLowerCase()), `${normalizeSlashes(sourceFilePath)} references an unsupported asset type: ${relativeValue}`);

  return {
    __assetImportPath: absolutePath,
  };
}

function createAssetArray(projectRoot, sourceFilePath, rawValues) {
  if (!Array.isArray(rawValues)) {
    return [];
  }

  return rawValues
    .map((item) => createAssetRef(projectRoot, sourceFilePath, item))
    .filter(Boolean);
}

function normalizeCaseStudy(rawCaseStudy, baseMessage) {
  if (!rawCaseStudy) {
    return undefined;
  }

  const value = ensureObject(rawCaseStudy, `${baseMessage} must be an object.`);
  const problem = ensureArray(value.problem ?? [], `${baseMessage}.problem must be an array of strings.`).map(String);
  const design = Array.isArray(value.design) ? value.design.map(String) : undefined;
  const reflection = value.reflection ? ensureObject(value.reflection, `${baseMessage}.reflection must be an object.`) : undefined;

  return {
    context: optionalString(value.context),
    problem,
    goal: optionalString(value.goal),
    solution: assertString(value.solution, `${baseMessage}.solution is required.`),
    design,
    workflow: optionalString(value.workflow),
    mvp: optionalString(value.mvp),
    reflection: reflection
      ? {
        pros: ensureArray(reflection.pros ?? [], `${baseMessage}.reflection.pros must be an array.`).map(String),
        cons: ensureArray(reflection.cons ?? [], `${baseMessage}.reflection.cons must be an array.`).map(String),
      }
      : undefined,
  };
}

function normalizeProjectExperiments(projectRoot, sourceFilePath, rawExperiments, baseMessage) {
  if (!Array.isArray(rawExperiments)) {
    return undefined;
  }

  return rawExperiments.map((item, itemIndex) => {
    const entry = ensureObject(item, `${baseMessage} #${itemIndex + 1} must be an object.`);

    return {
      title: assertString(entry.title, `${baseMessage} #${itemIndex + 1} is missing title.`),
      tag: optionalString(entry.tag),
      image: createAssetRef(projectRoot, sourceFilePath, entry.image),
      description: assertString(entry.description, `${baseMessage} #${itemIndex + 1} is missing description.`),
      linkLabel: optionalString(entry.linkLabel),
      url: optionalString(entry.url),
    };
  });
}

function readProjectOverview(projectRoot, filePath) {
  const document = readMarkdownFile(filePath);
  const data = ensureObject(document.data, `${normalizeSlashes(filePath)} frontmatter must be an object.`);

  const maybeCaseStudy = data.solution || data.problem || data.context
    ? normalizeCaseStudy(
      {
        context: data.context,
        problem: data.problem,
        goal: data.goal,
        solution: data.solution,
        design: data.design,
        workflow: data.workflow,
        reflection: data.reflection,
      },
      `${normalizeSlashes(filePath)} case study`
    )
    : undefined;

  return {
    title: assertString(data.title, `${normalizeSlashes(filePath)} is missing "title".`),
    subtitle: assertString(data.subtitle, `${normalizeSlashes(filePath)} is missing "subtitle".`),
    problemLine: optionalString(data.problemLine),
    description: assertString(data.description, `${normalizeSlashes(filePath)} is missing "description".`),
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    detailImages: createAssetArray(projectRoot, filePath, data.detailImages),
    experiments: normalizeProjectExperiments(projectRoot, filePath, data.experiments, `${normalizeSlashes(filePath)} experiments`),
    caseStudy: maybeCaseStudy,
    body: document.body,
  };
}

function readOptionalMarkdownBody(filePath) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  return readMarkdownFile(filePath).body || undefined;
}

function readProject(projectRoot, projectDirectoryPath) {
  const metaPath = path.join(projectDirectoryPath, 'meta.yml');
  const overviewZhPath = path.join(projectDirectoryPath, 'overview.zh.md');
  const overviewEnPath = path.join(projectDirectoryPath, 'overview.en.md');
  const prdPath = path.join(projectDirectoryPath, 'prd.md');
  const userGuidePath = path.join(projectDirectoryPath, 'user-guide.md');
  const techSpecPath = path.join(projectDirectoryPath, 'tech-spec.md');

  assert(fs.existsSync(metaPath), `Missing project meta file: ${normalizeSlashes(metaPath)}`);
  assert(fs.existsSync(overviewZhPath), `Missing overview.zh.md in ${normalizeSlashes(projectDirectoryPath)}`);
  assert(fs.existsSync(overviewEnPath), `Missing overview.en.md in ${normalizeSlashes(projectDirectoryPath)}`);

  const meta = ensureObject(readYamlFile(metaPath), `${normalizeSlashes(metaPath)} must be a YAML object.`);
  const projectId = assertString(meta.id, `${normalizeSlashes(metaPath)} is missing "id".`);
  const status = meta.status ? ensureObject(meta.status, `${normalizeSlashes(metaPath)} status must be an object.`) : undefined;

  if (status?.tone) {
    assert(VALID_STATUS_TONES.has(status.tone), `${normalizeSlashes(metaPath)} has invalid status tone "${status.tone}".`);
  }

  const proofLink = meta.proofLink ? ensureObject(meta.proofLink, `${normalizeSlashes(metaPath)} proofLink must be an object.`) : undefined;
  const cta = meta.cta ? ensureObject(meta.cta, `${normalizeSlashes(metaPath)} cta must be an object.`) : undefined;
  const zh = readProjectOverview(projectRoot, overviewZhPath);
  const en = readProjectOverview(projectRoot, overviewEnPath);

  return {
    id: projectId,
    title: zh.title,
    subtitle: zh.subtitle,
    problemLine: zh.problemLine,
    description: zh.description,
    year: assertString(meta.year, `${normalizeSlashes(metaPath)} is missing "year".`),
    role: assertString(meta.role, `${normalizeSlashes(metaPath)} is missing "role".`),
    outcome: assertString(meta.outcome, `${normalizeSlashes(metaPath)} is missing "outcome".`),
    icon: optionalString(meta.icon) ?? 'work',
    themeColor: optionalString(meta.themeColor),
    webLink: optionalString(meta.webLink),
    prd: readOptionalMarkdownBody(prdPath),
    userGuide: readOptionalMarkdownBody(userGuidePath),
    techSpec: readOptionalMarkdownBody(techSpecPath),
    cover: createAssetRef(projectRoot, metaPath, meta.coverLight),
    detailImages: zh.detailImages,
    version: optionalString(meta.version),
    status: status
      ? {
        zh: assertString(status.zh, `${normalizeSlashes(metaPath)} status.zh is required.`),
        en: assertString(status.en, `${normalizeSlashes(metaPath)} status.en is required.`),
        tone: status.tone ?? 'stable',
      }
      : undefined,
    positioningLine: optionalString(meta.positioningLine),
    keywords: zh.keywords,
    proofLink: proofLink
      ? {
        label: assertString(proofLink.label, `${normalizeSlashes(metaPath)} proofLink.label is required.`),
        url: assertString(proofLink.url, `${normalizeSlashes(metaPath)} proofLink.url is required.`),
      }
      : undefined,
    nextStep: optionalString(meta.nextStep),
    validationStatus: optionalString(meta.validationStatus),
    cta: cta
      ? {
        web: optionalString(cta.web),
        desktopMode: optionalString(cta.desktopMode),
        desktopUrl: optionalString(cta.desktopUrl),
      }
      : undefined,
    isPrimary: optionalBoolean(meta.isPrimary, optionalBoolean(meta.published, false)),
    order: typeof meta.order === 'number' ? meta.order : 999,
    published: optionalBoolean(meta.published, false),
    assets: {
      coverLight: createAssetRef(projectRoot, metaPath, meta.coverLight),
      coverDark: createAssetRef(projectRoot, metaPath, meta.coverDark),
    },
    docs: {
      prd: readOptionalMarkdownBody(prdPath),
      userGuide: readOptionalMarkdownBody(userGuidePath),
      techSpec: readOptionalMarkdownBody(techSpecPath),
    },
    locales: {
      zh,
      en,
    },
    caseStudy: zh.caseStudy && en.caseStudy
      ? {
        zh: zh.caseStudy,
        en: en.caseStudy,
      }
      : undefined,
  };
}

function readHomeContent(filePath) {
  const document = readMarkdownFile(filePath);
  const data = ensureObject(document.data, `${normalizeSlashes(filePath)} frontmatter must be an object.`);
  const hero = ensureObject(data.hero, `${normalizeSlashes(filePath)} is missing "hero".`);
  const sidebar = ensureObject(data.sidebar, `${normalizeSlashes(filePath)} is missing "sidebar".`);
  const projectSection = ensureObject(data.projectSection, `${normalizeSlashes(filePath)} is missing "projectSection".`);
  const timeline = ensureObject(data.timeline, `${normalizeSlashes(filePath)} is missing "timeline".`);
  const quickLinks = ensureObject(data.quickLinks, `${normalizeSlashes(filePath)} is missing "quickLinks".`);
  const footer = ensureObject(data.footer, `${normalizeSlashes(filePath)} is missing "footer".`);
  const interviewerPath = ensureObject(data.interviewerPath, `${normalizeSlashes(filePath)} is missing "interviewerPath".`);

  return {
    hero: {
      greeting: assertString(hero.greeting, `${normalizeSlashes(filePath)} hero.greeting is required.`),
      description: assertString(hero.description, `${normalizeSlashes(filePath)} hero.description is required.`),
    },
    sidebar: {
      name: assertString(sidebar.name, `${normalizeSlashes(filePath)} sidebar.name is required.`),
      targetRoleValue: assertString(sidebar.targetRoleValue, `${normalizeSlashes(filePath)} sidebar.targetRoleValue is required.`),
      targetCityValue: assertString(sidebar.targetCityValue, `${normalizeSlashes(filePath)} sidebar.targetCityValue is required.`),
      age: optionalString(sidebar.age) ?? '',
      mbti: assertString(sidebar.mbti, `${normalizeSlashes(filePath)} sidebar.mbti is required.`),
      experience: assertString(sidebar.experience, `${normalizeSlashes(filePath)} sidebar.experience is required.`),
      profileStatement: assertString(sidebar.profileStatement, `${normalizeSlashes(filePath)} sidebar.profileStatement is required.`),
      skillList: ensureArray(sidebar.skillList ?? [], `${normalizeSlashes(filePath)} sidebar.skillList must be an array.`).map(String),
      skillTags: ensureArray(sidebar.skillTags ?? [], `${normalizeSlashes(filePath)} sidebar.skillTags must be an array.`).map(String),
      explore: assertString(sidebar.explore, `${normalizeSlashes(filePath)} sidebar.explore is required.`),
    },
    projectSection: {
      title: assertString(projectSection.title, `${normalizeSlashes(filePath)} projectSection.title is required.`),
      subtitle: optionalString(projectSection.subtitle) ?? '',
    },
    timeline: {
      title: assertString(timeline.title, `${normalizeSlashes(filePath)} timeline.title is required.`),
      subtitle: optionalString(timeline.subtitle) ?? '',
      items: ensureArray(timeline.items ?? [], `${normalizeSlashes(filePath)} timeline.items must be an array.`).map((item, itemIndex) => {
        const entry = ensureObject(item, `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} must be an object.`);
        return {
          id: assertString(entry.id, `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} is missing id.`),
          icon: assertString(entry.icon, `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} is missing icon.`),
          period: assertString(entry.period, `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} is missing period.`),
          title: assertString(entry.title, `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} is missing title.`),
          keywords: ensureArray(entry.keywords ?? [], `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} keywords must be an array.`).map(String),
          detail: assertString(entry.detail, `${normalizeSlashes(filePath)} timeline item #${itemIndex + 1} is missing detail.`),
        };
      }),
    },
    quickLinks: {
      contact: assertString(quickLinks.contact, `${normalizeSlashes(filePath)} quickLinks.contact is required.`),
      blog: assertString(quickLinks.blog, `${normalizeSlashes(filePath)} quickLinks.blog is required.`),
    },
    interviewerPath: {
      title: assertString(interviewerPath.title, `${normalizeSlashes(filePath)} interviewerPath.title is required.`),
      subtitle: assertString(interviewerPath.subtitle, `${normalizeSlashes(filePath)} interviewerPath.subtitle is required.`),
      methodLabel: assertString(interviewerPath.methodLabel, `${normalizeSlashes(filePath)} interviewerPath.methodLabel is required.`),
      casesLabel: assertString(interviewerPath.casesLabel, `${normalizeSlashes(filePath)} interviewerPath.casesLabel is required.`),
    },
    footer: {
      copyright: assertString(footer.copyright, `${normalizeSlashes(filePath)} footer.copyright is required.`),
      style: assertString(footer.style, `${normalizeSlashes(filePath)} footer.style is required.`),
    },
    metrics: ensureArray(data.metrics ?? [], `${normalizeSlashes(filePath)} metrics must be an array.`).map((metric, metricIndex) => {
      const entry = ensureObject(metric, `${normalizeSlashes(filePath)} metric #${metricIndex + 1} must be an object.`);
      return {
        label: assertString(entry.label, `${normalizeSlashes(filePath)} metric #${metricIndex + 1} is missing label.`),
        value: assertStringAllowEmpty(entry.value, `${normalizeSlashes(filePath)} metric #${metricIndex + 1} is missing value.`),
        icon: optionalString(entry.icon),
      };
    }),
  };
}

function readResumeContent(filePath) {
  const document = readMarkdownFile(filePath);
  const data = ensureObject(document.data, `${normalizeSlashes(filePath)} frontmatter must be an object.`);

  return {
    heading: assertString(data.heading, `${normalizeSlashes(filePath)} heading is required.`),
    name: assertString(data.name, `${normalizeSlashes(filePath)} name is required.`),
    summary: assertString(data.summary, `${normalizeSlashes(filePath)} summary is required.`),
    statement: assertString(data.statement, `${normalizeSlashes(filePath)} statement is required.`),
    basicsTitle: assertString(data.basicsTitle, `${normalizeSlashes(filePath)} basicsTitle is required.`),
    strengthsTitle: assertString(data.strengthsTitle, `${normalizeSlashes(filePath)} strengthsTitle is required.`),
    workTitle: assertString(data.workTitle, `${normalizeSlashes(filePath)} workTitle is required.`),
    projectTitle: assertString(data.projectTitle, `${normalizeSlashes(filePath)} projectTitle is required.`),
    updatedLabel: assertString(data.updatedLabel, `${normalizeSlashes(filePath)} updatedLabel is required.`),
    updatedAt: assertString(data.updatedAt, `${normalizeSlashes(filePath)} updatedAt is required.`),
    featuredProjectIds: ensureArray(data.featuredProjectIds ?? [], `${normalizeSlashes(filePath)} featuredProjectIds must be an array.`).map(String),
    basics: ensureArray(data.basics ?? [], `${normalizeSlashes(filePath)} basics must be an array.`).map((item, itemIndex) => {
      const entry = ensureObject(item, `${normalizeSlashes(filePath)} basics item #${itemIndex + 1} must be an object.`);
      return {
        label: assertString(entry.label, `${normalizeSlashes(filePath)} basics item #${itemIndex + 1} is missing label.`),
        value: assertString(entry.value, `${normalizeSlashes(filePath)} basics item #${itemIndex + 1} is missing value.`),
      };
    }),
    strengths: ensureArray(data.strengths ?? [], `${normalizeSlashes(filePath)} strengths must be an array.`).map(String),
    experiences: ensureArray(data.experiences ?? [], `${normalizeSlashes(filePath)} experiences must be an array.`).map((item, itemIndex) => {
      const entry = ensureObject(item, `${normalizeSlashes(filePath)} experience #${itemIndex + 1} must be an object.`);
      return {
        company: assertString(entry.company, `${normalizeSlashes(filePath)} experience #${itemIndex + 1} is missing company.`),
        role: assertString(entry.role, `${normalizeSlashes(filePath)} experience #${itemIndex + 1} is missing role.`),
        period: assertString(entry.period, `${normalizeSlashes(filePath)} experience #${itemIndex + 1} is missing period.`),
        bullets: ensureArray(entry.bullets ?? [], `${normalizeSlashes(filePath)} experience #${itemIndex + 1} bullets must be an array.`).map(String),
      };
    }),
    projectRoleValues: ensureObject(data.projectRoleValues ?? {}, `${normalizeSlashes(filePath)} projectRoleValues must be an object.`),
    projectBullets: ensureObject(data.projectBullets ?? {}, `${normalizeSlashes(filePath)} projectBullets must be an object.`),
  };
}

function readContactContent(filePath) {
  const document = readMarkdownFile(filePath);
  const data = ensureObject(document.data, `${normalizeSlashes(filePath)} frontmatter must be an object.`);

  return {
    wechatCardTitle: assertString(data.wechatCardTitle, `${normalizeSlashes(filePath)} wechatCardTitle is required.`),
    wechatDescription: assertString(data.wechatDescription, `${normalizeSlashes(filePath)} wechatDescription is required.`),
    wechatIdLabel: assertString(data.wechatIdLabel, `${normalizeSlashes(filePath)} wechatIdLabel is required.`),
    copyLabel: assertString(data.copyLabel, `${normalizeSlashes(filePath)} copyLabel is required.`),
    copiedLabel: assertString(data.copiedLabel, `${normalizeSlashes(filePath)} copiedLabel is required.`),
    scanHint: assertString(data.scanHint, `${normalizeSlashes(filePath)} scanHint is required.`),
    channels: ensureArray(data.channels ?? [], `${normalizeSlashes(filePath)} channels must be an array.`).map((item, itemIndex) => {
      const entry = ensureObject(item, `${normalizeSlashes(filePath)} channel #${itemIndex + 1} must be an object.`);
      return {
        id: assertString(entry.id, `${normalizeSlashes(filePath)} channel #${itemIndex + 1} is missing id.`),
        label: assertString(entry.label, `${normalizeSlashes(filePath)} channel #${itemIndex + 1} is missing label.`),
        value: assertString(entry.value, `${normalizeSlashes(filePath)} channel #${itemIndex + 1} is missing value.`),
        linkKey: assertString(entry.linkKey, `${normalizeSlashes(filePath)} channel #${itemIndex + 1} is missing linkKey.`),
      };
    }),
  };
}

function readBlogCategories(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = ensureObject(readYamlFile(filePath), `${normalizeSlashes(filePath)} must be a YAML object.`);
  return ensureArray(data.categories ?? [], `${normalizeSlashes(filePath)} categories must be an array.`).map((category, categoryIndex) => {
    const entry = ensureObject(category, `${normalizeSlashes(filePath)} category #${categoryIndex + 1} must be an object.`);
    return {
      id: assertString(entry.id, `${normalizeSlashes(filePath)} category #${categoryIndex + 1} is missing id.`),
      title: ensureLanguageMap(entry.title, `${normalizeSlashes(filePath)} category #${categoryIndex + 1} title must contain zh/en.`),
      description: entry.description
        ? ensureLanguageMap(entry.description, `${normalizeSlashes(filePath)} category #${categoryIndex + 1} description must contain zh/en.`)
        : undefined,
    };
  });
}

function normalizeBlogCategoryId(rawValue, blogCategories, filePath) {
  const value = optionalString(rawValue);
  if (!value) {
    return undefined;
  }

  const categoryValue = value.trim();
  const category = blogCategories.find((item) =>
    item.id === categoryValue ||
    item.title.zh === categoryValue ||
    item.title.en === categoryValue
  );

  if (!category) {
    assert(blogCategories.length === 0, `${normalizeSlashes(filePath)} references unknown blog category "${categoryValue}".`);
    return categoryValue;
  }

  return category.id;
}

function readBlogArticle(projectRoot, articleTextDir, articleMediaDir, blogCategories = []) {
  const folderName = path.basename(articleTextDir);
  const id = folderName;

  // Find cover image: any image file (jpg, png, jpeg, webp, etc.)
  const mediaDir = fs.existsSync(articleMediaDir) ? articleMediaDir : articleTextDir;
  const files = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  let coverFile = files.find(f => {
    const ext = path.extname(f).toLowerCase();
    return imageExts.includes(ext);
  });
  let cover = undefined;
  if (coverFile) {
    const absolutePath = path.resolve(mediaDir, coverFile);
    const relativeToProject = normalizeSlashes(path.relative(projectRoot, absolutePath));
    if (relativeToProject.startsWith(`${CONTENT_ROOT_NAME}/`) && fs.existsSync(absolutePath) && ASSET_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) {
      cover = {
        __assetImportPath: absolutePath,
      };
    }
  }

  // Read summary from 摘要.txt
  const summaryPath = path.join(articleTextDir, '摘要.txt');
  let summary = '';
  if (fs.existsSync(summaryPath)) {
    summary = readTextFile(summaryPath).trim();
  }

  // Read links from 链接.txt
  const linkPath = path.join(articleTextDir, '链接.txt');
  let wechat = undefined;
  let twitter = undefined;
  if (fs.existsSync(linkPath)) {
    const linkContent = readTextFile(linkPath).trim();
    const lines = linkContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) wechat = lines[0];
    if (lines.length > 1) twitter = lines[1];
  }

  const categoryPath = path.join(articleTextDir, '分类.txt');
  const categoryId = fs.existsSync(categoryPath)
    ? normalizeBlogCategoryId(readTextFile(categoryPath), blogCategories, categoryPath)
    : undefined;

  // Support 标题.txt per folder
  const titlePath = path.join(articleTextDir, '标题.txt');
  let title = id;
  if (fs.existsSync(titlePath)) {
    const t = readTextFile(titlePath).trim();
    if (t) title = t;
  } else if (/^\d{8}$/.test(id)) {
    title = `${id.substring(0,4)}-${id.substring(4,6)}-${id.substring(6,8)}`;
  }

  // Extract date robustly from folder name (YYYYMMDD or YYYY-MM-DD)
  let date = undefined;
  let dateMatch = id.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  return {
    id,
    title,
    summary: summary || title,
    cover: cover || undefined,
    wechat,
    twitter,
    categoryId,
    date,
    order: undefined,
  };
}

function readSkillsContent(projectRoot, filePath) {
  const data = ensureObject(readYamlFile(filePath), `${normalizeSlashes(filePath)} must be a YAML object.`);
  const dashboard = ensureObject(data.dashboard, `${normalizeSlashes(filePath)} is missing dashboard.`);
  const modal = ensureObject(data.modal, `${normalizeSlashes(filePath)} is missing modal.`);

  return {
    dashboard: {
      title: ensureLanguageMap(dashboard.title, `${normalizeSlashes(filePath)} dashboard.title must contain zh/en.`),
      subtitle: ensureLanguageMap(dashboard.subtitle, `${normalizeSlashes(filePath)} dashboard.subtitle must contain zh/en.`),
      categories: ensureArray(dashboard.categories ?? [], `${normalizeSlashes(filePath)} dashboard.categories must be an array.`).map((category, categoryIndex) => {
        const entry = ensureObject(category, `${normalizeSlashes(filePath)} dashboard category #${categoryIndex + 1} must be an object.`);
        return {
          id: assertString(entry.id, `${normalizeSlashes(filePath)} dashboard category #${categoryIndex + 1} is missing id.`),
          title: ensureLanguageMap(entry.title, `${normalizeSlashes(filePath)} dashboard category #${categoryIndex + 1} title must contain zh/en.`),
          tools: ensureArray(entry.tools ?? [], `${normalizeSlashes(filePath)} dashboard category #${categoryIndex + 1} tools must be an array.`).map((tool, toolIndex) => {
            const toolEntry = ensureObject(tool, `${normalizeSlashes(filePath)} dashboard tool #${toolIndex + 1} must be an object.`);
            return {
              id: assertString(toolEntry.id, `${normalizeSlashes(filePath)} dashboard tool #${toolIndex + 1} is missing id.`),
              name: assertString(toolEntry.name, `${normalizeSlashes(filePath)} dashboard tool #${toolIndex + 1} is missing name.`),
              logoColor: createAssetRef(projectRoot, filePath, toolEntry.logoColor),
              logoMono: createAssetRef(projectRoot, filePath, toolEntry.logoMono),
            };
          }),
        };
      }),
    },
    modal: {
      intro: ensureLanguageMap(modal.intro, `${normalizeSlashes(filePath)} modal.intro must contain zh/en.`),
      categories: ensureArray(modal.categories ?? [], `${normalizeSlashes(filePath)} modal.categories must be an array.`).map((category, categoryIndex) => {
        const entry = ensureObject(category, `${normalizeSlashes(filePath)} modal category #${categoryIndex + 1} must be an object.`);
        return {
          title: assertString(entry.title, `${normalizeSlashes(filePath)} modal category #${categoryIndex + 1} is missing title.`),
          description: assertString(entry.description, `${normalizeSlashes(filePath)} modal category #${categoryIndex + 1} is missing description.`),
          items: ensureArray(entry.items ?? [], `${normalizeSlashes(filePath)} modal category #${categoryIndex + 1} items must be an array.`).map((item, itemIndex) => {
            const itemEntry = ensureObject(item, `${normalizeSlashes(filePath)} modal item #${itemIndex + 1} must be an object.`);
            return {
              name: assertString(itemEntry.name, `${normalizeSlashes(filePath)} modal item #${itemIndex + 1} is missing name.`),
              short: assertString(itemEntry.short, `${normalizeSlashes(filePath)} modal item #${itemIndex + 1} is missing short.`),
              bg: assertString(itemEntry.bg, `${normalizeSlashes(filePath)} modal item #${itemIndex + 1} is missing bg.`),
              color: assertString(itemEntry.color, `${normalizeSlashes(filePath)} modal item #${itemIndex + 1} is missing color.`),
            };
          }),
        };
      }),
    },
  };
}

function readSiteConfig(configPath) {
  // config/site.yml 是可选文件：缺省时署名关闭，保证旧内容目录完全兼容。
  const defaults = {
    attribution: {
      enabled: false,
      labelZh: '本站基于开源模板搭建',
      labelEn: 'Built with an open-source template',
      url: '',
    },
  };

  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  const data = ensureObject(readYamlFile(configPath), `${normalizeSlashes(configPath)} must be a YAML object.`);
  const attribution = isPlainObject(data.attribution) ? data.attribution : {};

  return {
    attribution: {
      enabled: attribution.enabled === true,
      labelZh: optionalString(attribution.labelZh) || defaults.attribution.labelZh,
      labelEn: optionalString(attribution.labelEn) || defaults.attribution.labelEn,
      url: optionalString(attribution.url) || '',
    },
  };
}

export function buildContentRegistry(projectRoot) {
  const contentRoot = path.join(projectRoot, CONTENT_ROOT_NAME);
  const textRoot = path.join(contentRoot, CONTENT_TEXT_ROOT_NAME);
  const mediaRoot = path.join(contentRoot, CONTENT_MEDIA_ROOT_NAME);
  const siteRoot = path.join(textRoot, 'site');
  const projectRootPath = path.join(textRoot, 'projects');
  const blogTextRootPath = path.join(textRoot, 'blog');
  const blogMediaRootPath = path.join(mediaRoot, 'blog');

  assert(fs.existsSync(contentRoot), `Missing content directory: ${normalizeSlashes(contentRoot)}`);
  assert(fs.existsSync(textRoot), `Missing text content directory: ${normalizeSlashes(textRoot)}`);
  assert(fs.existsSync(mediaRoot), `Missing media content directory: ${normalizeSlashes(mediaRoot)}`);
  assert(fs.existsSync(siteRoot), `Missing site content directory: ${normalizeSlashes(siteRoot)}`);
  assert(fs.existsSync(projectRootPath), `Missing project content directory: ${normalizeSlashes(projectRootPath)}`);

  const sharedPath = path.join(siteRoot, 'shared.yml');
  const homeZhPath = path.join(siteRoot, 'home.zh.md');
  const homeEnPath = path.join(siteRoot, 'home.en.md');
  const resumeZhPath = path.join(siteRoot, 'resume.zh.md');
  const resumeEnPath = path.join(siteRoot, 'resume.en.md');
  const contactZhPath = path.join(siteRoot, 'contact.zh.md');
  const contactEnPath = path.join(siteRoot, 'contact.en.md');
  const skillsPath = path.join(siteRoot, 'skills.yml');

  for (const requiredFile of [sharedPath, homeZhPath, homeEnPath, resumeZhPath, resumeEnPath, contactZhPath, contactEnPath, skillsPath]) {
    assert(fs.existsSync(requiredFile), `Missing required content file: ${normalizeSlashes(requiredFile)}`);
  }

  const shared = ensureObject(readYamlFile(sharedPath), `${normalizeSlashes(sharedPath)} must be a YAML object.`);
  const sharedAssets = ensureObject(shared.assets ?? {}, `${normalizeSlashes(sharedPath)} is missing assets.`);
  const sharedLinks = ensureObject(shared.links ?? {}, `${normalizeSlashes(sharedPath)} is missing links.`);
  const blogCategoriesPath = path.join(blogTextRootPath, 'categories.yml');
  const blogCategories = readBlogCategories(blogCategoriesPath);

  const registry = {
    site: {
      shared: {
        person: {
          displayName: assertString(shared.person?.displayName, `${normalizeSlashes(sharedPath)} person.displayName is required.`),
          legalName: assertString(shared.person?.legalName, `${normalizeSlashes(sharedPath)} person.legalName is required.`),
        },
        links: {
          wechatId: assertString(sharedLinks.wechatId, `${normalizeSlashes(sharedPath)} links.wechatId is required.`),
          x: assertString(sharedLinks.x, `${normalizeSlashes(sharedPath)} links.x is required.`),
          xiaohongshu: assertString(sharedLinks.xiaohongshu, `${normalizeSlashes(sharedPath)} links.xiaohongshu is required.`),
          github: assertString(sharedLinks.github, `${normalizeSlashes(sharedPath)} links.github is required.`),
          email: assertString(sharedLinks.email, `${normalizeSlashes(sharedPath)} links.email is required.`),
        },
        assets: {
          avatarLight: createAssetRef(projectRoot, sharedPath, sharedAssets.avatarLight),
          avatarDark: createAssetRef(projectRoot, sharedPath, sharedAssets.avatarDark),
          wechatQr: createAssetRef(projectRoot, sharedPath, sharedAssets.wechatQr),
          brandMark: createAssetRef(projectRoot, sharedPath, sharedAssets.brandMark),
        },
      },
      home: {
        zh: readHomeContent(homeZhPath),
        en: readHomeContent(homeEnPath),
      },
      resume: {
        zh: readResumeContent(resumeZhPath),
        en: readResumeContent(resumeEnPath),
      },
      contact: {
        zh: readContactContent(contactZhPath),
        en: readContactContent(contactEnPath),
      },
      skills: readSkillsContent(projectRoot, skillsPath),
    },
    siteConfig: readSiteConfig(path.join(contentRoot, 'config', 'site.yml')),
    projects: fs
      .readdirSync(projectRootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readProject(projectRoot, path.join(projectRootPath, entry.name)))
      .sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || left.id.localeCompare(right.id)),
    blogCategories,
    blog: fs.existsSync(blogTextRootPath)
      ? fs
          .readdirSync(blogTextRootPath, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => readBlogArticle(
            projectRoot,
            path.join(blogTextRootPath, entry.name),
            path.join(blogMediaRootPath, entry.name),
            blogCategories
          ))
          .filter(Boolean)
          .sort((left, right) => {
            const getKey = (item) => item.date || item.id;
            return getKey(right).localeCompare(getKey(left));
          })
      : [],
  };

  const seenProjectIds = new Set();
  for (const project of registry.projects) {
    assert(!seenProjectIds.has(project.id), `Duplicate project id "${project.id}" in content/text/projects.`);
    seenProjectIds.add(project.id);
  }

  return registry;
}

function collectAssetPaths(value, collected = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetPaths(item, collected));
    return collected;
  }

  if (isPlainObject(value)) {
    if (value.__assetImportPath) {
      if (!collected.has(value.__assetImportPath)) {
        collected.set(value.__assetImportPath, `asset${collected.size}`);
      }
      return collected;
    }

    Object.values(value).forEach((item) => collectAssetPaths(item, collected));
  }

  return collected;
}

function serializeValue(value, assetVariableMap, indentLevel = 0) {
  const indent = '  '.repeat(indentLevel);
  const childIndent = '  '.repeat(indentLevel + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    return `[\n${value.map((item) => `${childIndent}${serializeValue(item, assetVariableMap, indentLevel + 1)}`).join(',\n')}\n${indent}]`;
  }

  if (isPlainObject(value)) {
    if (value.__assetImportPath) {
      return assetVariableMap.get(value.__assetImportPath);
    }

    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }

    return `{\n${entries
      .map(([key, entryValue]) => `${childIndent}${JSON.stringify(key)}: ${serializeValue(entryValue, assetVariableMap, indentLevel + 1)}`)
      .join(',\n')}\n${indent}}`;
  }

  return JSON.stringify(value);
}

export function renderContentRegistryModule(projectRoot, registry, outputFilePath = path.join(projectRoot, GENERATED_FILE_RELATIVE_PATH)) {
  const outputDirectory = path.dirname(outputFilePath);
  const assetPaths = collectAssetPaths(registry);
  const importLines = Array.from(assetPaths.entries()).map(([absoluteAssetPath, variableName]) => {
    const relativeImportPath = normalizeSlashes(path.relative(outputDirectory, absoluteAssetPath));
    return `import ${variableName} from ${JSON.stringify(relativeImportPath)};`;
  });

  const code = `/**
 * This file is auto-generated by content-system/core.js.
 * Do not edit it manually. Update files in content/ instead.
 */

import type { ContentRegistry } from '../types';
${importLines.length ? `${importLines.join('\n')}\n` : ''}
export const contentRegistry: ContentRegistry = ${serializeValue(registry, assetPaths, 0)};
`;

  return ensureTrailingNewline(code);
}

export function writeContentRegistryFile(projectRoot) {
  const registry = buildContentRegistry(projectRoot);
  const outputFilePath = path.join(projectRoot, GENERATED_FILE_RELATIVE_PATH);
  const nextContent = renderContentRegistryModule(projectRoot, registry, outputFilePath);
  const previousContent = fs.existsSync(outputFilePath) ? fs.readFileSync(outputFilePath, 'utf8') : '';

  if (previousContent !== nextContent) {
    fs.writeFileSync(outputFilePath, nextContent, 'utf8');
  }

  return {
    registry,
    outputFilePath,
    changed: previousContent !== nextContent,
  };
}

export function ensureContentIsValid(projectRoot) {
  return buildContentRegistry(projectRoot);
}

export function getNextProjectOrder(projectRoot) {
  const projectsRoot = path.join(projectRoot, CONTENT_ROOT_NAME, CONTENT_TEXT_ROOT_NAME, 'projects');
  if (!fs.existsSync(projectsRoot)) {
    return 10;
  }

  const orders = fs
    .readdirSync(projectsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(projectsRoot, entry.name, 'meta.yml'))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      const meta = readYamlFile(filePath);
      return typeof meta.order === 'number' ? meta.order : 0;
    });

  return (Math.max(0, ...orders) || 0) + 10;
}

export function scaffoldProject(projectRoot, projectId) {
  assert(/^[a-z0-9-]+$/.test(projectId), 'Project id must use lowercase letters, numbers, and hyphens only.');

  const nextOrder = getNextProjectOrder(projectRoot);
  const projectDirectoryPath = path.join(projectRoot, CONTENT_ROOT_NAME, CONTENT_TEXT_ROOT_NAME, 'projects', projectId);
  const projectMediaDirectoryPath = path.join(projectRoot, CONTENT_ROOT_NAME, CONTENT_MEDIA_ROOT_NAME, 'projects', projectId);
  assert(!fs.existsSync(projectDirectoryPath), `Project "${projectId}" already exists.`);
  assert(!fs.existsSync(projectMediaDirectoryPath), `Project media folder "${projectId}" already exists.`);

  fs.mkdirSync(projectDirectoryPath, { recursive: true });
  fs.mkdirSync(projectMediaDirectoryPath, { recursive: true });

  const metaTemplate = `id: ${projectId}
order: ${nextOrder}
published: false
isPrimary: false
year: "2026"
role: "待补充"
outcome: "待补充"
icon: "work"
themeColor: "#94A3B8"
webLink: ""
version: ""
validationStatus: ""
coverLight: "../../../media/projects/${projectId}/cover-light.jpg"
coverDark: "../../../media/projects/${projectId}/cover-dark.jpg"
status:
  zh: "草稿中"
  en: "Draft"
  tone: "beta"
`;

  const overviewTemplate = (language) => `---
title: "${projectId}"
subtitle: "${language === 'zh' ? '请填写项目副标题' : 'Add a project subtitle'}"
problemLine: "${language === 'zh' ? '请填写一句问题定义' : 'Add a one-line problem statement'}"
description: "${language === 'zh' ? '请填写项目简介' : 'Add a short project description'}"
keywords:
  - "${language === 'zh' ? '关键词一' : 'keyword-one'}"
detailImages: []
context: "${language === 'zh' ? '补充项目背景' : 'Explain the project context'}"
problem:
  - "${language === 'zh' ? '补充一个核心问题' : 'Describe one core problem'}"
goal: "${language === 'zh' ? '补充项目目标' : 'Describe the product goal'}"
solution: "${language === 'zh' ? '补充解决方案' : 'Describe the solution'}"
design:
  - "${language === 'zh' ? '补充一个设计要点' : 'Describe one design choice'}"
workflow: "${language === 'zh' ? '补充技术或工作流说明' : 'Describe the workflow or technical approach'}"
reflection:
  pros:
    - "${language === 'zh' ? '补充一个亮点' : 'Add one strength'}"
  cons:
    - "${language === 'zh' ? '补充一个后续优化点' : 'Add one follow-up improvement'}"
---

${language === 'zh'
    ? '在这里补充更长的项目叙述、补充说明或发布备注。'
    : 'Use the body for longer narrative notes, release notes, or extra context.'}
`;

  const docTemplate = (title) => `# ${title}

${title === 'PRD'
    ? 'Add your product requirements here.'
    : title === 'User Guide'
      ? 'Add your user guide here.'
      : 'Add your technical notes here.'}
`;

  const assetsReadme = `# Project Media

- Put this project's images, PDFs, or other supporting files here.
- Recommended names:
  - cover-light.jpg
  - cover-dark.jpg
  - 01.jpg
  - 02.jpg
- If you add images, update content/text/projects/${projectId}/meta.yml or overview.*.md to reference them.
- From the text files, this folder is referenced as ../../../media/projects/${projectId}/
`;

  fs.writeFileSync(path.join(projectDirectoryPath, 'meta.yml'), ensureTrailingNewline(metaTemplate), 'utf8');
  fs.writeFileSync(path.join(projectDirectoryPath, 'overview.zh.md'), ensureTrailingNewline(overviewTemplate('zh')), 'utf8');
  fs.writeFileSync(path.join(projectDirectoryPath, 'overview.en.md'), ensureTrailingNewline(overviewTemplate('en')), 'utf8');
  fs.writeFileSync(path.join(projectDirectoryPath, 'prd.md'), ensureTrailingNewline(docTemplate('PRD')), 'utf8');
  fs.writeFileSync(path.join(projectDirectoryPath, 'user-guide.md'), ensureTrailingNewline(docTemplate('User Guide')), 'utf8');
  fs.writeFileSync(path.join(projectDirectoryPath, 'tech-spec.md'), ensureTrailingNewline(docTemplate('Tech Spec')), 'utf8');
  fs.writeFileSync(path.join(projectMediaDirectoryPath, 'README.md'), ensureTrailingNewline(assetsReadme), 'utf8');

  return {
    projectDirectoryPath,
    projectMediaDirectoryPath,
    nextOrder,
  };
}
