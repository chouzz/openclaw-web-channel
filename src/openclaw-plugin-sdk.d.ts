declare module 'openclaw/plugin-sdk/plugin-entry' {
  export function definePluginEntry(def: {
    id: string;
    name: string;
    description: string;
    register: (api: any) => void;
    configSchema?: unknown;
  }): any;
}

declare module 'openclaw/plugin-sdk/session-transcript-runtime' {
  export function readSessionTranscriptEvents(
    input: string | { sessionFile: string },
  ): Promise<any[]>;
}
