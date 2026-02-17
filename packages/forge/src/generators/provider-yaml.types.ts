/**
 * TypeScript types for provider YAML schema files.
 */

export interface ProviderMethod {
  name: string;
  path: string;
  streamParam: string;
}

export interface ProviderSpans {
  system: string;
  modelPrefixes: string[];
}

export interface ProviderYaml {
  name: string;
  displayName: string;
  sdkPackage: string;
  clientClass: string;
  methods: ProviderMethod[];
  spans: ProviderSpans;
  apiUrls: string[];
  models: Record<string, { input: number; output: number }>;
}
