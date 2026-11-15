import * as fs from 'node:fs';
import { SfError } from '@salesforce/core';

export type KeyFileEntry = Record<string, string>;

export type InstallationKeyResolverOptions = {
  installationKeysFlag?: string;
  installationKeysFilePath?: string;
};

export class InstallationKeyResolver {
  private fileKeys: Map<string, string> = new Map();
  private flagKeys: Map<string, string> = new Map();

  public constructor(options: InstallationKeyResolverOptions = {}) {
    if (options.installationKeysFlag) {
      this.parseFlagKeys(options.installationKeysFlag);
    }
    if (options.installationKeysFilePath) {
      this.loadFileKeys(options.installationKeysFilePath);
    }
  }

  /**
   * Resolves the installation key for a given package name/alias using the priority:
   * 1. Environment variable: SF_PKGM_<PACKAGE_NAME_OR_ALIAS>_KEY (exact match)
   * 2. Key file: JSON array of [{"PackageAlias": "key"}]
   * 3. Flag: -k, --installation-keys "PkgA:key1,PkgB:key2"
   * 4. Environment variable fallback: SF_PKGM_INSTALLATION_KEY
   */
  public resolveKey(packageName: string): string | undefined {
    // 1. Specific environment variable
    const envSpecificKey = process.env[`SF_PKGM_${packageName}_KEY`];
    if (envSpecificKey && envSpecificKey.trim() !== '') {
      return envSpecificKey;
    }

    // 2. File keys
    const fileKey = this.fileKeys.get(packageName);
    if (fileKey && fileKey.trim() !== '') {
      return fileKey;
    }

    // 3. Flag keys
    const flagKey = this.flagKeys.get(packageName);
    if (flagKey && flagKey.trim() !== '') {
      return flagKey;
    }

    // 4. Fallback environment variable
    const envFallbackKey = process.env.SF_PKGM_INSTALLATION_KEY;
    if (envFallbackKey && envFallbackKey.trim() !== '') {
      return envFallbackKey;
    }

    return undefined;
  }

  private parseFlagKeys(flagValue: string): void {
    // Format: "PkgA:key1,PkgB:key2"
    const pairs = flagValue.split(',');
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) {
        throw new SfError(
          `Invalid installation-keys format: "${pair}". Expected format "PackageAlias:key".`,
          'InvalidInstallationKeysFlag'
        );
      }
      const pkg = pair.substring(0, colonIndex).trim();
      const key = pair.substring(colonIndex + 1).trim();
      if (pkg) {
        this.flagKeys.set(pkg, key);
      }
    }
  }

  private loadFileKeys(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent) as unknown;

      if (!Array.isArray(parsed)) {
        throw new SfError(
          `The installation keys file "${filePath}" must be a JSON array of objects in the format [{"PackageAlias": "key"}].`,
          'InvalidInstallationKeysFile'
        );
      }

      for (const entry of parsed) {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
          throw new SfError(
            `Invalid entry in installation keys file: ${JSON.stringify(
              entry
            )}. Expected an object with {"PackageAlias": "key"}.`,
            'InvalidInstallationKeysFileEntry'
          );
        }
        for (const [pkg, key] of Object.entries(entry as Record<string, unknown>)) {
          if (typeof key === 'string') {
            this.fileKeys.set(pkg, key);
          }
        }
      }
    } catch (err) {
      if (err instanceof SfError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new SfError(
        `Failed to read or parse installation keys file "${filePath}": ${message}`,
        'InstallationKeysFileReadError'
      );
    }
  }
}
