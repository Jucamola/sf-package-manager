import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { SfProject } from '@salesforce/core';
import Install from '../../../../../src/commands/package/manager/dependencies/install.js';
import { DependencyResolver } from '../../../../../src/services/dependencyResolver.js';
import { PackageInstaller } from '../../../../../src/services/packageInstaller.js';

describe('package manager dependencies install', () => {
  const $$ = new TestContext();
  let testOrg: MockTestOrgData;
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(async () => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
    testOrg = new MockTestOrgData();
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    process.exitCode = 0;
  });

  it('runs command with no dependencies found', async () => {
    $$.SANDBOX.stub(SfProject, 'resolve').resolves({} as any);
    $$.SANDBOX.stub(DependencyResolver, 'resolve').resolves([]);

    const result = await Install.run(['-o', testOrg.username]);
    expect(result).to.deep.equal([]);
  });

  it('runs command and successfully installs dependencies', async () => {
    $$.SANDBOX.stub(SfProject, 'resolve').resolves({} as any);
    $$.SANDBOX.stub(DependencyResolver, 'resolve').resolves([
      {
        packageName: 'PkgA',
        packageVersionId: '04t100000000001AAA',
        versionNumber: '1.0.0.1',
      },
    ]);

    $$.SANDBOX.stub(PackageInstaller, 'install').resolves([
      {
        packageName: 'PkgA',
        packageVersionId: '04t100000000001AAA',
        versionNumber: '1.0.0.1',
        status: 'Installed',
        message: 'Package installed successfully',
      },
    ]);

    const result = await Install.run(['-o', testOrg.username]);
    expect(result).to.have.length(1);
    expect(result[0].status).to.equal('Installed');
    expect(sfCommandStubs.table.calledOnce).to.be.true;
    expect(process.exitCode).to.equal(0);
  });

  it('sets exit code to 1 when a dependency fails', async () => {
    $$.SANDBOX.stub(SfProject, 'resolve').resolves({} as any);
    $$.SANDBOX.stub(DependencyResolver, 'resolve').resolves([
      {
        packageName: 'PkgA',
        packageVersionId: '04t100000000001AAA',
      },
    ]);

    $$.SANDBOX.stub(PackageInstaller, 'install').resolves([
      {
        packageName: 'PkgA',
        packageVersionId: '04t100000000001AAA',
        status: 'Failed',
        message: 'Error during installation',
      },
    ]);

    const result = await Install.run(['-o', testOrg.username]);
    expect(result).to.have.length(1);
    expect(result[0].status).to.equal('Failed');
    expect(process.exitCode).to.equal(1);
  });
});
