export interface PluginConfig {
  gatewayUrl: string;
  gatewayToken: string;
  token?: string;
}

export async function getConfig(api: any): Promise<PluginConfig> {
  // Read plugin-specific config from openclaw.json
  const pluginConfig = (await api.runtime.getPluginConfig?.()) || {};

  // Try to get gateway config to find the token and port
  const gatewayConfig = (await api.runtime.getConfig?.()) || {};

  const gatewayToken = pluginConfig.gatewayToken || gatewayConfig.gateway?.auth?.token || "";
  const gatewayPort = gatewayConfig.gateway?.port || 18789;
  const gatewayHost = gatewayConfig.gateway?.host || "127.0.0.1";

  const gatewayUrl = pluginConfig.gatewayUrl || `ws://${gatewayHost}:${gatewayPort}`;

  return {
    gatewayUrl,
    gatewayToken,
    token: pluginConfig.token,
  };
}
