import { Messages, SfProject } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { DependencyResolver } from '../../../../services/dependencyResolver.js';
import { InstallationKeyResolver } from '../../../../services/installationKeyResolver.js';
import { PackageInstaller, PackageInstallResult } from '../../../../services/packageInstaller.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-package-manager', 'package.manager.dependencies.install');

export default class Install extends SfCommand<PackageInstallResult[]> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly aliases = ['pkgm:dependencies:install'];

  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
    }),
    'target-dev-hub': Flags.optionalHub({
      summary: messages.getMessage('flags.target-dev-hub.summary'),
    }),
    package: Flags.string({
      char: 'p',
      summary: messages.getMessage('flags.package.summary'),
    }),
    'installation-keys': Flags.string({
      char: 'k',
      summary: messages.getMessage('flags.installation-keys.summary'),
    }),
    'installation-keys-file': Flags.file({
      summary: messages.getMessage('flags.installation-keys-file.summary'),
      exists: true,
    }),
    'apex-compile': Flags.custom<'all' | 'package'>({
      options: ['all', 'package'],
      summary: messages.getMessage('flags.apex-compile.summary'),
      default: 'all',
    })(),
    'upgrade-type': Flags.custom<'deprecate-only' | 'mixed' | 'delete'>({
      options: ['deprecate-only', 'mixed', 'delete'],
      summary: messages.getMessage('flags.upgrade-type.summary'),
      default: 'mixed',
    })(),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      unit: 'minutes',
      defaultValue: 0,
    }),
    force: Flags.boolean({
      char: 'f',
      summary: messages.getMessage('flags.force.summary'),
      default: false,
    }),
    'continue-on-error': Flags.boolean({
      summary: messages.getMessage('flags.continue-on-error.summary'),
      default: false,
    }),
    'api-version': Flags.orgApiVersion(),
  };

  public async run(): Promise<PackageInstallResult[]> {
    const { flags } = await this.parse(Install);
    const project = await SfProject.resolve();

    this.spinner.start(messages.getMessage('info.resolvingDependencies'));

    const hubConnection = flags['target-dev-hub']?.getConnection(flags['api-version']);
    const targetOrgConnection = flags['target-org'].getConnection(flags['api-version']);

    const dependencies = await DependencyResolver.resolve({
      project,
      packageName: flags.package,
      hubConnection,
    });

    this.spinner.stop();

    if (dependencies.length === 0) {
      this.log(messages.getMessage('info.noDependencies'));
      return [];
    }

    this.log(messages.getMessage('info.dependenciesFound', [dependencies.length.toString()]));

    const keyResolver = new InstallationKeyResolver({
      installationKeysFlag: flags['installation-keys'],
      installationKeysFilePath: flags['installation-keys-file'],
    });

    const results = await PackageInstaller.install({
      targetOrgConnection,
      dependencies,
      keyResolver,
      apexCompile: flags['apex-compile'],
      upgradeType: flags['upgrade-type'],
      wait: flags.wait,
      force: flags.force,
      continueOnError: flags['continue-on-error'],
      onProgress: (event) => {
        switch (event.type) {
          case 'installing':
            this.spinner.start(event.message);
            break;
          case 'completed':
          case 'skipped':
          case 'failed':
            this.spinner.stop(event.message);
            break;
          case 'checking':
            this.spinner.status = event.message;
            break;
        }
      },
    });

    this.spinner.stop();

    this.log();
    this.table({
      data: results,
      columns: [
        { key: 'packageName', name: 'Package' },
        { key: 'packageVersionId', name: 'Version ID' },
        { key: 'versionNumber', name: 'Version Number' },
        { key: 'status', name: 'Status' },
        { key: 'message', name: 'Message' },
      ],
    });

    const hasFailures = results.some((r) => r.status === 'Failed');
    if (hasFailures) {
      process.exitCode = 1;
      this.error(messages.getMessage('error.installationFailed'), { exit: false });
    }

    return results;
  }
}
