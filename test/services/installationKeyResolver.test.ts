import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { expect } from 'chai';
import { InstallationKeyResolver } from '../../src/services/installationKeyResolver.js';

describe('InstallationKeyResolver', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkgm-key-test-'));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves key from specific env var (Priority 1)', () => {
    process.env['SF_PKGM_PkgA_KEY'] = 'envSpecificKey';
    process.env.SF_PKGM_INSTALLATION_KEY = 'envFallbackKey';

    const resolver = new InstallationKeyResolver({
      installationKeysFlag: 'PkgA:flagKey',
    });

    const key = resolver.resolveKey('PkgA');
    expect(key).to.equal('envSpecificKey');
  });

  it('resolves key from file when specific env var is not set (Priority 2)', () => {
    const filePath = path.join(tempDir, 'keys.json');
    fs.writeFileSync(filePath, JSON.stringify([{ PkgA: 'fileKey' }, { PkgB: 'fileKeyB' }]));

    process.env.SF_PKGM_INSTALLATION_KEY = 'envFallbackKey';

    const resolver = new InstallationKeyResolver({
      installationKeysFilePath: filePath,
      installationKeysFlag: 'PkgA:flagKey',
    });

    const key = resolver.resolveKey('PkgA');
    expect(key).to.equal('fileKey');
  });

  it('resolves key from flag when env var and file are not set (Priority 3)', () => {
    process.env.SF_PKGM_INSTALLATION_KEY = 'envFallbackKey';

    const resolver = new InstallationKeyResolver({
      installationKeysFlag: 'PkgA:flagKey,PkgB:flagKeyB',
    });

    const key = resolver.resolveKey('PkgA');
    expect(key).to.equal('flagKey');
  });

  it('resolves key from general fallback env var (Priority 4)', () => {
    process.env.SF_PKGM_INSTALLATION_KEY = 'envFallbackKey';

    const resolver = new InstallationKeyResolver();

    const key = resolver.resolveKey('PkgA');
    expect(key).to.equal('envFallbackKey');
  });

  it('returns undefined if no key is found at any level', () => {
    delete process.env.SF_PKGM_INSTALLATION_KEY;
    delete process.env['SF_PKGM_PkgA_KEY'];

    const resolver = new InstallationKeyResolver();
    const key = resolver.resolveKey('PkgA');
    expect(key).to.be.undefined;
  });

  it('throws error when keys file is not an array', () => {
    const filePath = path.join(tempDir, 'invalid-keys.json');
    fs.writeFileSync(filePath, JSON.stringify({ PkgA: 'notAnArray' }));

    expect(() => {
      new InstallationKeyResolver({ installationKeysFilePath: filePath });
    }).to.throw(/must be a JSON array of objects/);
  });

  it('throws error when flag format is invalid', () => {
    expect(() => {
      new InstallationKeyResolver({ installationKeysFlag: 'invalidFormatNoColon' });
    }).to.throw(/Invalid installation-keys format/);
  });
});
