import yaml from 'yaml';
import * as fs from 'fs';

const defaultConfig = {
  host: '::',
  port: 3000,
};

export type LoadConfig = typeof defaultConfig;

export async function loadConfig(): Promise<LoadConfig> {
  let readConfig: Partial<LoadConfig> = {};
  try {
    const configText = await fs.promises.readFile('./config.yaml', 'utf-8');
    readConfig = yaml.parse(configText);
  } catch (e) {
    console.error(`Failed to read config: ${e.toString()}`);
  }
  return {
    ...defaultConfig,
    ...readConfig,
    ...process.env,
  };
}
