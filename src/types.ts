export interface Config {
  id: string;
  name: string;
  api_key: string;
  base_url: string;
  model?: string;
}

export interface Provider {
  id: string;
  name: string;
  alias: string;
  configs: Config[];
  active_config_id?: string;
}

export interface AppConfig {
  providers: Provider[];
}
