/**
 * [INPUT]   : Vercel 环境自动注入的 process.env 与当前请求对象
 * [OUTPUT]  : Coze Access Token API 响应
 * [POS]     : Vercel Serverless Function 路由
 * [DECISION]: 直接复用通用 CozeTokenService，保持平台适配层尽可能薄
 */
import { createCozeTokenHandler } from '../../server/cozeTokenService';

export const GET = async (request: Request): Promise<Response> =>
  createCozeTokenHandler(request, process.env);
