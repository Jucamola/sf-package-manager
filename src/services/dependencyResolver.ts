import { Connection, SfError, SfProject, isNamedPackagingDirectory } from '@salesforce/core';
import { PackageDescriptorJson, SubscriberPackageVersion } from '@salesforce/packaging';

export type ResolvedDependency = {
  packageName: string;
  packageVersionId: string;
  versionNumber?: string;
  branch?: string;
  sourcePackage?: string;
};

export type ResolveDependenciesOptions = {
  project: SfProject;
  packageName?: string;
  hubConnection?: Connection;
};

type ProjectDependency = {
  package?: string;
  versionNumber?: string;
  branch?: string;
  subscriberPackageVersionId?: string;
};

export class DependencyResolver {
  /**
   * Resolves direct package dependencies declared in sfdx-project.json
   * for the given package or for all packages if none is specified.
   */
  public static async resolve(options: ResolveDependenciesOptions): Promise<ResolvedDependency[]> {
    const { project, packageName, hubConnection } = options;
    const packageDirectories = project.getPackageDirectories();
    const packageAliases = project.getPackageAliases() ?? {};

    // Filter to only directories that define packaging information
    const packagingDirectories = packageDirectories.filter(isNamedPackagingDirectory);

    // 1. Filter target package directories
    let targetDirectories = packagingDirectories;
    if (packageName) {
      targetDirectories = packagingDirectories.filter((dir) => dir.package === packageName);
      if (targetDirectories.length === 0) {
        throw new SfError(
          `Package "${packageName}" was not found in sfdx-project.json packageDirectories.`,
          'PackageNotFound'
        );
      }
    }

    const resolvedDependencies: ResolvedDependency[] = [];

    // 2. Traverse package directories in order
    for (const dir of targetDirectories) {
      const dependencies = (dir.dependencies ?? []) as ProjectDependency[];
      for (const dep of dependencies) {
        const depPackageName = dep.package;
        if (!depPackageName) {
          throw new SfError(
            `Found a dependency without a "package" property in package directory "${dir.package ?? dir.path}".`,
            'MissingPackageProperty'
          );
        }

        // Check if subscriberPackageVersionId is directly defined in dependency
        if (dep.subscriberPackageVersionId?.startsWith('04t')) {
          resolvedDependencies.push({
            packageName: depPackageName,
            packageVersionId: dep.subscriberPackageVersionId,
            versionNumber: dep.versionNumber,
            branch: dep.branch,
            sourcePackage: dir.package,
          });
          continue;
        }

        // Resolve alias from project
        const aliasValue = project.getPackageIdFromAlias(depPackageName) ?? packageAliases[depPackageName];
        if (!aliasValue) {
          throw new SfError(
            `Alias "${depPackageName}" was not found in sfdx-project.json packageAliases.`,
            'AliasNotFound'
          );
        }

        if (aliasValue.startsWith('04t')) {
          // Direct SubscriberPackageVersionId
          resolvedDependencies.push({
            packageName: depPackageName,
            packageVersionId: aliasValue,
            versionNumber: dep.versionNumber,
            branch: dep.branch,
            sourcePackage: dir.package,
          });
        } else if (aliasValue.startsWith('0Ho')) {
          // Package2 Id: needs DevHub and versionNumber to resolve 04t
          if (!hubConnection) {
            throw new SfError(
              `DevHub connection is required to resolve version for package "${depPackageName}" (Package ID: ${aliasValue}). Please specify -v / --target-dev-hub or set a default dev hub.`,
              'DevHubRequired'
            );
          }
          if (!dep.versionNumber) {
            throw new SfError(
              `Dependency "${depPackageName}" maps to package ID "${aliasValue}" but has no "versionNumber" defined.`,
              'MissingVersionNumber'
            );
          }

          try {
            const descriptor: Partial<PackageDescriptorJson> = {
              packageId: aliasValue,
              versionNumber: dep.versionNumber,
              branch: dep.branch,
            };
            // eslint-disable-next-line no-await-in-loop
            const resolved04t = await SubscriberPackageVersion.resolveId(hubConnection, descriptor);

            resolvedDependencies.push({
              packageName: depPackageName,
              packageVersionId: resolved04t,
              versionNumber: dep.versionNumber,
              branch: dep.branch,
              sourcePackage: dir.package,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new SfError(
              `Failed to resolve package version ID for "${depPackageName}" (${aliasValue}) with version "${dep.versionNumber}": ${message}`,
              'VersionResolutionError'
            );
          }
        } else {
          throw new SfError(
            `Alias "${depPackageName}" resolved to invalid ID "${aliasValue}". Expected a 04t or 0Ho ID.`,
            'InvalidAliasId'
          );
        }
      }
    }

    return resolvedDependencies;
  }
}
