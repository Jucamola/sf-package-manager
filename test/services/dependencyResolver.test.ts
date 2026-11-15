import { expect } from 'chai';
import sinon from 'sinon';
import { SfProject, Connection } from '@salesforce/core';
import { SubscriberPackageVersion } from '@salesforce/packaging';
import { DependencyResolver } from '../../src/services/dependencyResolver.js';

describe('DependencyResolver', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  const mockProject = (packageDirs: any[], packageAliases: Record<string, string> = {}) => {
    const project = {
      getPackageDirectories: () => packageDirs,
      getPackageAliases: () => packageAliases,
      getPackageIdFromAlias: (alias: string) => packageAliases[alias],
    } as unknown as SfProject;
    return project;
  };

  it('resolves direct 04t package aliases', async () => {
    const project = mockProject(
      [
        {
          package: 'MainPkg',
          dependencies: [{ package: 'DepA' }, { package: 'DepB', versionNumber: '1.0.0.1' }],
        },
      ],
      {
        DepA: '04t100000000001AAA',
        DepB: '04t100000000002BBB',
      }
    );

    const resolved = await DependencyResolver.resolve({ project });
    expect(resolved).to.have.length(2);
    expect(resolved[0]).to.deep.include({
      packageName: 'DepA',
      packageVersionId: '04t100000000001AAA',
      sourcePackage: 'MainPkg',
    });
    expect(resolved[1]).to.deep.include({
      packageName: 'DepB',
      packageVersionId: '04t100000000002BBB',
      versionNumber: '1.0.0.1',
      sourcePackage: 'MainPkg',
    });
  });

  it('filters dependencies by specified package name', async () => {
    const project = mockProject(
      [
        {
          package: 'Pkg1',
          dependencies: [{ package: 'Dep1' }],
        },
        {
          package: 'Pkg2',
          dependencies: [{ package: 'Dep2' }],
        },
      ],
      {
        Dep1: '04t100000000001AAA',
        Dep2: '04t100000000002BBB',
      }
    );

    const resolved = await DependencyResolver.resolve({ project, packageName: 'Pkg2' });
    expect(resolved).to.have.length(1);
    expect(resolved[0].packageName).to.equal('Dep2');
  });

  it('resolves 0Ho package ID using DevHub connection', async () => {
    const project = mockProject(
      [
        {
          package: 'MainPkg',
          dependencies: [{ package: 'Package2Alias', versionNumber: '1.2.0.LATEST', branch: 'main' }],
        },
      ],
      {
        Package2Alias: '0Ho100000000001AAA',
      }
    );

    const hubConn = {} as Connection;
    sandbox.stub(SubscriberPackageVersion, 'resolveId').resolves('04tResolvedFromHub');

    const resolved = await DependencyResolver.resolve({
      project,
      hubConnection: hubConn,
    });

    expect(resolved).to.have.length(1);
    expect(resolved[0]).to.deep.include({
      packageName: 'Package2Alias',
      packageVersionId: '04tResolvedFromHub',
      versionNumber: '1.2.0.LATEST',
      branch: 'main',
    });
  });

  it('throws error when package name filter is not found', async () => {
    const project = mockProject([
      {
        package: 'MainPkg',
        dependencies: [],
      },
    ]);

    try {
      await DependencyResolver.resolve({ project, packageName: 'NonExistent' });
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err.name).to.equal('PackageNotFound');
    }
  });

  it('throws error when alias is not found in packageAliases', async () => {
    const project = mockProject([
      {
        package: 'MainPkg',
        dependencies: [{ package: 'UnknownAlias' }],
      },
    ]);

    try {
      await DependencyResolver.resolve({ project });
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err.name).to.equal('AliasNotFound');
    }
  });

  it('throws error when 0Ho package has no DevHub connection provided', async () => {
    const project = mockProject(
      [
        {
          package: 'MainPkg',
          dependencies: [{ package: 'Package2Alias', versionNumber: '1.0.0.1' }],
        },
      ],
      {
        Package2Alias: '0Ho100000000001AAA',
      }
    );

    try {
      await DependencyResolver.resolve({ project });
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err.name).to.equal('DevHubRequired');
    }
  });

  it('throws error when 0Ho package has no versionNumber', async () => {
    const project = mockProject(
      [
        {
          package: 'MainPkg',
          dependencies: [{ package: 'Package2Alias' }],
        },
      ],
      {
        Package2Alias: '0Ho100000000001AAA',
      }
    );

    try {
      await DependencyResolver.resolve({ project, hubConnection: {} as Connection });
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err.name).to.equal('MissingVersionNumber');
    }
  });
});
