import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const composeFile = fileURLToPath(
  new URL('./docker-compose.yml', import.meta.url),
);
const project = 'nicot-simple-user-tests';

function compose(args: string[], inheritOutput = true) {
  return execFileSync(
    'docker',
    ['compose', '-p', project, '-f', composeFile, ...args],
    { stdio: inheritOutput ? 'inherit' : 'ignore' },
  );
}

export default function setup() {
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '55432';
  process.env.DB_USER = 'postgres';
  process.env.DB_PASS = 'postgres';
  process.env.DB_NAME = 'postgres';
  process.env.DB_DROP_SCHEMA = '1';
  process.env.REDIS_URL = 'redis://127.0.0.1:56379';

  compose(['down', '-v', '--remove-orphans'], false);
  compose(['up', '-d', '--wait']);

  return () => {
    try {
      compose(['logs', '--no-color']);
    } finally {
      compose(['down', '-v', '--remove-orphans']);
    }
  };
}
