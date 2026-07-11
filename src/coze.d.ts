/**
 * [INPUT]  ：无
 * [OUTPUT] ：Coze Web SDK 的全局类型声明
 * [POS]    ：全局类型层，支撑 chatbot 模块
 * [DECISION]：通过 declare global 暴露类型，避免在业务代码中重复导入
 */

export { };

declare global {
  interface CozeAuthConfig {
    type: 'token';
    token: string;
    onRefreshToken: () => string | Promise<string>;
  }

  type CozeResolvedAuthConfig = CozeAuthConfig;

  interface CozeComponentProps {
    title: string;
    layout: 'pc' | 'mobile';
  }

  interface CozeWebChatClientConfig {
    config: {
      bot_id: string;
    };
    componentProps: CozeComponentProps;
    auth: CozeAuthConfig;
  }

  interface CozeWebChatClient {
    show?(): void;
    open?(): void;
    hide?(): void;
    close?(): void;
  }

  interface CozeWebSDKGlobal {
    WebChatClient: new (config: CozeWebChatClientConfig) => CozeWebChatClient;
  }

  interface CozeServerToken {
    accessToken: string;
    expiresAt: number;
  }

  type CozeServerTokenFetchResult =
    | { kind: 'token'; token: CozeServerToken }
    | { kind: 'absent' }
    | { kind: 'unconfigured' };

  interface Window {
    CozeWebSDK?: CozeWebSDKGlobal;
  }

  interface ImportMetaEnv {
    readonly VITE_COZE_BOT_ID?: string;
    readonly VITE_COZE_PAT?: string;
  }
}
