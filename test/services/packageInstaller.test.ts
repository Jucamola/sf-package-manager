import { expect } from 'chai';
import sinon from 'sinon';
import { Connection } from '@salesforce/core';
import { SubscriberPackageVersion } from '@salesforce/packaging';
import { PackageInstaller } from '../../src/services/packageInstaller.js';
import { InstallationKeyResolver } from '../../src/services/installationKeyResolver.js';
import { ResolvedDependency } from '../../src/services/dependencyResolver.js';

describe('PackageInstaller', () => {
  const sandbox = sinon.createSandbox();
  let fakeConnection: Connection;
  let keyResolver: InstallationKeyResolver;

  beforeEach(() => {
    fakeConnection = {} as Connection;
    keyResolver = new InstallationKeyResolver();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('skips package if already installed and force is false', async () => {
    sandbox.stub(SubscriberPackageVersion, 'installedList').resolves([
      {
        SubscriberPackageVersion: { Id: '04t100000000001AAA' },
      } as any,
    ]);

    const installStub = sandbox.stub(SubscriberPackageVersion.prototype, 'install');

    const dependencies: ResolvedDependency[] = [
      {
        packageName: 'AlreadyInstalledPkg',
        packageVersionId: '04t100000000001AAA',
        versionNumber: '1.0.0.1',
      },
    ];

    const results = await PackageInstaller.install({
      targetOrgConnection: fakeConnection,
      dependencies,
      keyResolver,
      force: false,
    });

    expect(results).to.have.length(1);
    expect(results[0].status).to.equal('Skipped');
    expect(installStub.called).to.be.false;
  });

  it('installs package if already installed but force is true', async () => {
    sandbox.stub(SubscriberPackageVersion, 'installedList').resolves([
      {
        SubscriberPackageVersion: { Id: '04t100000000001AAA' },
      } as any,
    ]);

    const installStub = sandbox.stub(SubscriberPackageVersion.prototype, 'install').resolves({
      Status: 'SUCCESS',
    } as any);

    const dependencies: ResolvedDependency[] = [
      {
        packageName: 'AlreadyInstalledPkg',
        packageVersionId: '04t100000000001AAA',
        versionNumber: '1.0.0.1',
      },
    ];

    const results = await PackageInstaller.install({
      targetOrgConnection: fakeConnection,
      dependencies,
      keyResolver,
      force: true,
    });

    expect(results).to.have.length(1);
    expect(results[0].status).to.equal('Installed');
    expect(installStub.calledOnce).to.be.true;
  });

  it('stops on first error when continueOnError is false', async () => {
    sandbox.stub(SubscriberPackageVersion, 'installedList').resolves([]);

    sandbox
      .stub(SubscriberPackageVersion.prototype, 'install')
      .onFirstCall()
      .rejects(new Error('Install failed'))
      .onSecondCall()
      .resolves({ Status: 'SUCCESS' } as any);

    const dependencies: ResolvedDependency[] = [
      { packageName: 'Pkg1', packageVersionId: '04t100000000001AAA' },
      { packageName: 'Pkg2', packageVersionId: '04t100000000002BBB' },
    ];

    const results = await PackageInstaller.install({
      targetOrgConnection: fakeConnection,
      dependencies,
      keyResolver,
      continueOnError: false,
    });

    expect(results).to.have.length(1);
    expect(results[0].status).to.equal('Failed');
  });

  it('continues with remaining packages when continueOnError is true', async () => {
    sandbox.stub(SubscriberPackageVersion, 'installedList').resolves([]);

    sandbox
      .stub(SubscriberPackageVersion.prototype, 'install')
      .onFirstCall()
      .rejects(new Error('Install failed'))
      .onSecondCall()
      .resolves({ Status: 'SUCCESS' } as any);

    const dependencies: ResolvedDependency[] = [
      { packageName: 'Pkg1', packageVersionId: '04t100000000001AAA' },
      { packageName: 'Pkg2', packageVersionId: '04t100000000002BBB' },
    ];

    const results = await PackageInstaller.install({
      targetOrgConnection: fakeConnection,
      dependencies,
      keyResolver,
      continueOnError: true,
    });

    expect(results).to.have.length(2);
    expect(results[0].status).to.equal('Failed');
    expect(results[1].status).to.equal('Installed');
  });
});
