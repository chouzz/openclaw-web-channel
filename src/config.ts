import type { IncomingMessage, ServerResponse } from 'node:http';

export interface PluginConfig {
  gatewayUrl: string;
  gatewayToken: string;
  webToken: string;
}

export async function getConfig(api: any): Promise<PluginConfig> {
  // api.pluginConfig contains the plugin-specific config from openclaw.json
  const pluginConfig = api.pluginConfig || {};

  // api.config is the full OpenClaw config
  const fullConfig = api.config || {};

  // Gateway token from plugin config, or try to read from gateway config
  const gatewayToken = pluginConfig.gatewayToken || '';

  // Gateway WS URL - default to localhost with the standard gateway port
  // OpenClaw gateway default port is 18789, but can be overridden
  const gatewayUrl = pluginConfig.gatewayUrl || 'ws://127.0.0.1:18789';

  // Web access token for authenticating browser requests
  const webToken = pluginConfig.token || '';

  return {
    gatewayUrl,
    gatewayToken,
    webToken,
  };
}
