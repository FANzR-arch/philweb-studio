/**
 * [INPUT]   : Cloudflare Pages Function 注入的 env 与请求对象
 * [OUTPUT]  : Coze Access Token API 响应
 * [POS]     : Cloudflare Pages Function 路由
 * [DECISION]: 直接复用通用 CozeTokenService，保持平台适配层尽可能薄
 */
import { createCozeTokenHandler } from '../../../server/cozeTokenService';

interface CloudflareFunctionContext {
  env: Record<string, string | undefined>;
  request: Request;
}

export const onRequestGet = async (context: CloudflareFunctionContext): Promise<Response> =>
  createCozeTokenHandler(context.request, context.env);
