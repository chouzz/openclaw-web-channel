export interface PluginConfig {
  webToken: string;
}

export function getConfig(api: any): PluginConfig {
  const pluginConfig = api.pluginConfig || {};
  const webToken = pluginConfig.token || '';

  return { webToken };
}
