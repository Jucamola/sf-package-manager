import { Connection } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { PackageInstallCreateRequest, PackageInstallOptions, SubscriberPackageVersion } from '@salesforce/packaging';
import { ResolvedDependency } from './dependencyResolver.js';
import { InstallationKeyResolver } from './installationKeyResolver.js';

export type PackageInstallStatus = 'Installed' | 'Skipped' | 'Failed' | 'InProgress';

export type PackageInstallResult = {
  packageName: string;
  packageVersionId: string;
  versionNumber?: string;
  status: PackageInstallStatus;
  message: string;
};

export type PackageInstallerOptions = {
  targetOrgConnection: Connection;
  dependencies: ResolvedDependency[];
  keyResolver: InstallationKeyResolver;
  apexCompile?: 'all' | 'package';
  upgradeType?: 'deprecate-only' | 'mixed' | 'delete';
  wait?: Duration;
  force?: boolean;
  continueOnError?: boolean;
  onProgress?: (event: InstallProgressEvent) => void;
};

export type InstallProgressEvent = {
  type: 'checking' | 'installing' | 'completed' | 'skipped' | 'failed';
  dependency?: ResolvedDependency;
  message: string;
};

export class PackageInstaller {
  public static async install(options: PackageInstallerOptions): Promise<PackageInstallResult[]> {
    const {
      targetOrgConnection,
      dependencies,
      keyResolver,
      apexCompile = 'all',
      upgradeType = 'mixed',
      wait = Duration.minutes(0),
      force = false,
      continueOnError = false,
      onProgress,
    } = options;

    const results: PackageInstallResult[] = [];
    const installedVersionIds = await this.getInstalledVersionIds(targetOrgConnection, onProgress);
    const mappedUpgradeType = this.mapUpgradeType(upgradeType);

    const installOptions: PackageInstallOptions = {
      publishFrequency: Duration.seconds(10),
      publishTimeout: wait,
      pollingFrequency: Duration.seconds(10),
      pollingTimeout: wait,
    };

    for (const dep of dependencies) {
      if (installedVersionIds.has(dep.packageVersionId) && !force) {
        onProgress?.({
          type: 'skipped',
          dependency: dep,
          message: `Package "${dep.packageName}" (${dep.packageVersionId}) is already installed. Skipping.`,
        });

        results.push({
          packageName: dep.packageName,
          packageVersionId: dep.packageVersionId,
          versionNumber: dep.versionNumber,
          status: 'Skipped',
          message: 'Package version is already installed',
        });
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await this.installSinglePackage({
        targetOrgConnection,
        dep,
        keyResolver,
        apexCompile,
        mappedUpgradeType,
        installOptions,
        onProgress,
      });

      if (result.status === 'Installed') {
        installedVersionIds.add(dep.packageVersionId);
      }

      results.push(result);

      if (result.status === 'Failed' && !continueOnError) {
        break;
      }
    }

    return results;
  }

  private static mapUpgradeType(
    upgradeType: 'deprecate-only' | 'mixed' | 'delete'
  ): 'delete-only' | 'deprecate-only' | 'mixed-mode' {
    if (upgradeType === 'delete') {
      return 'delete-only';
    }
    if (upgradeType === 'deprecate-only') {
      return 'deprecate-only';
    }
    return 'mixed-mode';
  }

  private static async getInstalledVersionIds(
    targetOrgConnection: Connection,
    onProgress?: (event: InstallProgressEvent) => void
  ): Promise<Set<string>> {
    onProgress?.({
      type: 'checking',
      message: 'Checking installed packages in target org...',
    });

    const installedVersionIds = new Set<string>();
    try {
      const installedRecords = await SubscriberPackageVersion.installedList(targetOrgConnection);
      for (const record of installedRecords) {
        const id = record.SubscriberPackageVersion?.Id;
        if (id) {
          installedVersionIds.add(id);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onProgress?.({
        type: 'checking',
        message: `Could not check installed packages: ${msg}. Proceeding without skip checks.`,
      });
    }

    return installedVersionIds;
  }

  private static async installSinglePackage(params: {
    targetOrgConnection: Connection;
    dep: ResolvedDependency;
    keyResolver: InstallationKeyResolver;
    apexCompile: 'all' | 'package';
    mappedUpgradeType: 'delete-only' | 'deprecate-only' | 'mixed-mode';
    installOptions: PackageInstallOptions;
    onProgress?: (event: InstallProgressEvent) => void;
  }): Promise<PackageInstallResult> {
    const { targetOrgConnection, dep, keyResolver, apexCompile, mappedUpgradeType, installOptions, onProgress } =
      params;

    onProgress?.({
      type: 'installing',
      dependency: dep,
      message: `Installing "${dep.packageName}" (${dep.packageVersionId})...`,
    });

    const installationKey = keyResolver.resolveKey(dep.packageName);

    const request: PackageInstallCreateRequest = {
      SubscriberPackageVersionKey: dep.packageVersionId,
      ApexCompileType: apexCompile,
      UpgradeType: mappedUpgradeType,
      ...(installationKey ? { Password: installationKey } : {}),
    };

    try {
      const spv = new SubscriberPackageVersion({
        connection: targetOrgConnection,
        aliasOrId: dep.packageVersionId,
        password: installationKey,
      });

      const installRequest = await spv.install(request, installOptions);

      if (installRequest.Status === 'SUCCESS') {
        onProgress?.({
          type: 'completed',
          dependency: dep,
          message: `Successfully installed "${dep.packageName}" (${dep.packageVersionId}).`,
        });
        return {
          packageName: dep.packageName,
          packageVersionId: dep.packageVersionId,
          versionNumber: dep.versionNumber,
          status: 'Installed',
          message: 'Package installed successfully',
        };
      }

      if (installRequest.Status === 'IN_PROGRESS') {
        onProgress?.({
          type: 'completed',
          dependency: dep,
          message: `Installation request submitted for "${dep.packageName}" (${dep.packageVersionId}). Status: IN_PROGRESS.`,
        });
        return {
          packageName: dep.packageName,
          packageVersionId: dep.packageVersionId,
          versionNumber: dep.versionNumber,
          status: 'InProgress',
          message: 'Installation in progress (timeout reached)',
        };
      }

      const errors = (installRequest.Errors?.errors ?? []) as Array<{ message?: string }>;
      const errorDetails =
        errors
          .map((e) => e.message ?? '')
          .filter(Boolean)
          .join(', ') || 'Unknown installation error';
      const errorMsg = `Installation failed with status "${installRequest.Status}": ${errorDetails}`;

      onProgress?.({
        type: 'failed',
        dependency: dep,
        message: errorMsg,
      });

      return {
        packageName: dep.packageName,
        packageVersionId: dep.packageVersionId,
        versionNumber: dep.versionNumber,
        status: 'Failed',
        message: errorMsg,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      onProgress?.({
        type: 'failed',
        dependency: dep,
        message: `Failed to install "${dep.packageName}": ${errorMsg}`,
      });

      return {
        packageName: dep.packageName,
        packageVersionId: dep.packageVersionId,
        versionNumber: dep.versionNumber,
        status: 'Failed',
        message: errorMsg,
      };
    }
  }
}
