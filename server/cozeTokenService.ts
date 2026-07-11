/**
 * [INPUT]   : JWT 密钥、Coze 配置与运行环境注入的变量
 * [OUTPUT]  : 用于申请、缓存与刷新 Coze Access Token 的通用服务逻辑
 * [POS]     : 服务端逻辑处理层
 * [DECISION]: 使用 jose 统一跨环境生成 JWT，让 Vercel 与 Cloudflare 复用同一套签发逻辑
 */
import { SignJWT, importPKCS8 } from 'jose';

const DEFAULT_COZE_API_BASE_URL = 'https://api.coze.cn';
const DEFAULT_TOKEN_DURATION_SECONDS = 900;
const TOKEN_REFRESH_SKEW_MS = 60_000;
const JWT_ALGORITHM = 'RS256';
const VISITOR_COOKIE_NAME = 'rzc_personal_ai_visitor';
const CHAT_SESSION_HEADER_NAME = 'x-rzc-chat-session';
const VISITOR_COOKIE_MAX_AGE_SECONDS = 31_536_000;
const DEFAULT_SESSION_NAME_PREFIX = 'rzc-personal-ai';
const MAX_ACTIVE_SESSION_TOKENS = 256;

type EnvSource = Record<string, string | undefined>;

interface CozeJwtConfig {
  apiBaseUrl: string;
  audience: string;
  clientId: string;
  publicKeyId: string;
  privateKey: string;
  durationSeconds: number;
  sessionName: string;
  scope?: unknown;
}

interface CozeAccessToken {
  accessToken: string;
  expiresAt: number;
}

interface VisitorSessionContext {
  visitorId: string;
  sessionName: string;
  setCookieHeader?: string;
}

const cachedTokens = new Map<string, CozeAccessToken>();
const inflightTokenPromises = new Map<string, Promise<CozeAccessToken>>();

class CozeTokenConfigError extends Error { }

class CozeTokenRequestError extends Error { }

const jsonResponse = (status: number, body: unknown, extraHeaders?: HeadersInit): Response => {
  const headers = new Headers(extraHeaders);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
};

const getEnvValue = (env: EnvSource, key: string): string | undefined => {
  const value = env[key]?.trim();
  return value ? value : undefined;
};

const getRequiredEnvValue = (env: EnvSource, key: string): string => {
  const value = getEnvValue(env, key);
  if (!value) {
    throw new CozeTokenConfigError(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseDurationSeconds = (env: EnvSource): number => {
  const rawValue = getEnvValue(env, 'COZE_JWT_DURATION_SECONDS');
  if (!rawValue) {
    return DEFAULT_TOKEN_DURATION_SECONDS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CozeTokenConfigError('COZE_JWT_DURATION_SECONDS must be a positive integer.');
  }

  return parsed;
};

const parseScope = (env: EnvSource): unknown => {
  const rawScope = getEnvValue(env, 'COZE_JWT_SCOPE_JSON');
  if (!rawScope) {
    return undefined;
  }

  try {
    return JSON.parse(rawScope);
  } catch {
    throw new CozeTokenConfigError('COZE_JWT_SCOPE_JSON must be valid JSON.');
  }
};

const normalizePrivateKey = (privateKey: string): string => privateKey.replace(/\\n/g, '\n').trim();

const loadJwtConfig = (env: EnvSource, sessionName: string): CozeJwtConfig => {
  const apiBaseUrl = getEnvValue(env, 'COZE_API_BASE_URL') ?? DEFAULT_COZE_API_BASE_URL;
  const audience = getEnvValue(env, 'COZE_OAUTH_AUDIENCE') ?? new URL(apiBaseUrl).host;
  const privateKey = normalizePrivateKey(getRequiredEnvValue(env, 'COZE_JWT_PRIVATE_KEY'));

  if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
    throw new CozeTokenConfigError(
      'COZE_JWT_PRIVATE_KEY must be PKCS#8 PEM (`BEGIN PRIVATE KEY`) for the shared Vercel/Cloudflare token route.',
    );
  }

  return {
    apiBaseUrl,
    audience,
    clientId: getRequiredEnvValue(env, 'COZE_JWT_CLIENT_ID'),
    publicKeyId: getRequiredEnvValue(env, 'COZE_JWT_PUBLIC_KEY_ID'),
    privateKey,
    durationSeconds: parseDurationSeconds(env),
    sessionName,
    scope: parseScope(env),
  };
};

const signClientAssertion = async (config: CozeJwtConfig): Promise<string> => {
  const privateKey = await importPKCS8(config.privateKey, JWT_ALGORITHM);
  const jwt = new SignJWT({ session_name: config.sessionName })
    .setProtectedHeader({ alg: JWT_ALGORITHM, kid: config.publicKeyId })
    .setIssuer(config.clientId)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime('1h')
    .setJti(crypto.randomUUID());

  return jwt.sign(privateKey);
};

const exchangeJwtForAccessToken = async (config: CozeJwtConfig): Promise<CozeAccessToken> => {
  const assertion = await signClientAssertion(config);
  const requestBody: Record<string, unknown> = {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    duration_seconds: config.durationSeconds,
  };

  if (config.scope) {
    requestBody.scope = config.scope;
  }

  const response = await fetch(`${config.apiBaseUrl}/api/permission/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${assertion}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; code?: number; msg?: string; error?: string }
    | null;

  if (!response.ok) {
    const message = payload?.msg ?? payload?.error ?? `Coze token exchange failed with ${response.status}`;
    throw new Error(message);
  }

  if (!payload?.access_token || typeof payload.expires_in !== 'number') {
    throw new Error('Coze token exchange returned an invalid payload.');
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
};

const hasFreshCachedToken = (token: CozeAccessToken | null): token is CozeAccessToken =>
  Boolean(token && token.expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS);

const isSecureRequest = (request: Request): boolean => {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto === 'https') {
    return true;
  }

  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
};

const readCookie = (request: Request, key: string): string | undefined => {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return undefined;
  }

  const prefix = `${key}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) {
      continue;
    }

    const rawValue = trimmed.slice(prefix.length);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return undefined;
};

const isValidVisitorId = (value: string | undefined): value is string =>
  Boolean(value && /^[A-Za-z0-9_-]{8,128}$/.test(value));

const isValidChatSessionId = (value: string | undefined): value is string =>
  Boolean(value && /^[A-Za-z0-9_-]{8,128}$/.test(value));

const buildVisitorCookie = (request: Request, visitorId: string): string => {
  const attributes = [
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(visitorId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${VISITOR_COOKIE_MAX_AGE_SECONDS}`,
  ];

  if (isSecureRequest(request)) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
};

const resolveVisitorSession = (request: Request, env: EnvSource): VisitorSessionContext => {
  const existingVisitorId = readCookie(request, VISITOR_COOKIE_NAME);
  const visitorId = isValidVisitorId(existingVisitorId) ? existingVisitorId : crypto.randomUUID();
  const sessionNamePrefix = getEnvValue(env, 'COZE_JWT_SESSION_NAME') ?? DEFAULT_SESSION_NAME_PREFIX;
  const chatSessionId = request.headers.get(CHAT_SESSION_HEADER_NAME)?.trim();

  if (!isValidChatSessionId(chatSessionId)) {
    throw new CozeTokenRequestError(
      `${CHAT_SESSION_HEADER_NAME} must be present and match /^[A-Za-z0-9_-]{8,128}$/.`,
    );
  }

  return {
    visitorId,
    sessionName: `${sessionNamePrefix}:${visitorId}:${chatSessionId}`,
    setCookieHeader: visitorId === existingVisitorId ? undefined : buildVisitorCookie(request, visitorId),
  };
};

const pruneExpiredTokens = (): void => {
  for (const [sessionName, token] of cachedTokens.entries()) {
    if (!hasFreshCachedToken(token)) {
      cachedTokens.delete(sessionName);
    }
  }
};

const rememberToken = (sessionName: string, token: CozeAccessToken): void => {
  cachedTokens.delete(sessionName);
  cachedTokens.set(sessionName, token);

  while (cachedTokens.size > MAX_ACTIVE_SESSION_TOKENS) {
    const oldestSessionName = cachedTokens.keys().next().value;
    if (!oldestSessionName) {
      break;
    }

    cachedTokens.delete(oldestSessionName);
  }
};

const getOrCreateAccessToken = async (env: EnvSource, sessionName: string): Promise<CozeAccessToken> => {
  pruneExpiredTokens();

  const cachedToken = cachedTokens.get(sessionName) ?? null;
  if (hasFreshCachedToken(cachedToken)) {
    rememberToken(sessionName, cachedToken);
    return cachedToken;
  }

  const inflightPromise = inflightTokenPromises.get(sessionName);
  if (inflightPromise) {
    return inflightPromise;
  }

  const nextPromise = exchangeJwtForAccessToken(loadJwtConfig(env, sessionName))
    .then((token) => {
      rememberToken(sessionName, token);
      return token;
    })
    .finally(() => {
      inflightTokenPromises.delete(sessionName);
    });

  inflightTokenPromises.set(sessionName, nextPromise);
  return nextPromise;
};

export const createCozeTokenHandler = async (request: Request, env: EnvSource): Promise<Response> => {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  let visitorSession: VisitorSessionContext;
  try {
    visitorSession = resolveVisitorSession(request, env);
  } catch (error) {
    if (error instanceof CozeTokenRequestError) {
      return jsonResponse(400, {
        error: 'invalid_chat_session',
        message: error.message,
      });
    }

    throw error;
  }

  const responseHeaders = visitorSession.setCookieHeader
    ? { 'set-cookie': visitorSession.setCookieHeader }
    : undefined;

  try {
    const token = await getOrCreateAccessToken(env, visitorSession.sessionName);
    return jsonResponse(200, token, responseHeaders);
  } catch (error) {
    if (error instanceof CozeTokenConfigError) {
      return jsonResponse(501, {
        error: 'coze_jwt_not_configured',
        message: error.message,
      }, responseHeaders);
    }

    const message = error instanceof Error ? error.message : 'Unknown Coze token error';
    return jsonResponse(502, {
      error: 'coze_token_exchange_failed',
      message,
    }, responseHeaders);
  }
};
