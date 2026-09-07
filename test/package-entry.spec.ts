import { createRequire } from 'node:module';
import * as esm from 'nicot-simple-user';

describe('package exports', () => {
  it('loads the built ESM entry', () => {
    expect(esm.SimpleUserModule).toBeTypeOf('function');
    expect(esm.SimpleUserService).toBeTypeOf('function');
    expect(esm.AragamiModule).toBeTypeOf('function');
  });

  it('keeps the CommonJS condition usable', () => {
    const cjs = createRequire(import.meta.url)('nicot-simple-user');
    expect(cjs.SimpleUserModule).toBeTypeOf('function');
    expect(cjs.SimpleUserService).toBeTypeOf('function');
  });
});
