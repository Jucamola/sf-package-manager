# sf-package-manager

[![NPM](https://img.shields.io/npm/v/sf-package-manager.svg?label=sf-package-manager)](https://www.npmjs.com/package/sf-package-manager) [![Downloads/week](https://img.shields.io/npm/dw/sf-package-manager.svg)](https://npmjs.org/package/sf-package-manager) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/sf-package-manager/main/LICENSE.txt)

## Using the template

This repository provides a template for creating a plugin for the Salesforce CLI. To convert this template to a working plugin:

1. Please get in touch with the Platform CLI team. We want to help you develop your plugin.
2. Generate your plugin:

   ```
   sf plugins install dev
   sf dev generate plugin

   git init -b main
   git add . && git commit -m "chore: initial commit"
   ```

3. Create your plugin's repo in the salesforcecli github org
4. When you're ready, replace the contents of this README with the information you want.

## Learn about `sf` plugins

Salesforce CLI plugins are based on the [oclif plugin framework](<(https://oclif.io/docs/introduction.html)>). Read the [plugin developer guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm) to learn about Salesforce CLI plugin development.

This repository contains a lot of additional scripts and tools to help with general Salesforce node development and enforce coding standards. You should familiarize yourself with some of the [node developer packages](#tooling) used by Salesforce.

Additionally, there are some additional tests that the Salesforce CLI will enforce if this plugin is ever bundled with the CLI. These test are included by default under the `posttest` script and it is required to keep these tests active in your plugin if you plan to have it bundled.

### Tooling

- [@salesforce/core](https://github.com/forcedotcom/sfdx-core)
- [@salesforce/kit](https://github.com/forcedotcom/kit)
- [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)
- [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)
- [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)
- [@salesforce/dev-config](https://github.com/forcedotcom/dev-config)
- [@salesforce/dev-scripts](https://github.com/forcedotcom/dev-scripts)

### Hooks

For cross clouds commands, e.g. `sf env list`, we utilize [oclif hooks](https://oclif.io/docs/hooks) to get the relevant information from installed plugins.

This plugin includes sample hooks in the [src/hooks directory](src/hooks). You'll just need to add the appropriate logic. You can also delete any of the hooks if they aren't required for your plugin.

# Everything past here is only a suggestion as to what should be in your specific plugin's description

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sf plugins install sf-package-manager@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

If you're interested in contributing, take a look at the [CONTRIBUTING](CONTRIBUTING.md) guide.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/sf-package-manager

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev.js` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev.js hello world
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf package manager dependencies install`](#sf-package-manager-dependencies-install)
- [`sf pkgm dependencies install`](#sf-pkgm-dependencies-install)

## `sf package manager dependencies install`

Install package dependencies defined in sfdx-project.json.

```
USAGE
  $ sf package manager dependencies install -o <value> [--json] [--flags-dir <value>] [-v <value>] [-p <value>] [-k <value>]
    [--installation-keys-file <value>] [--apex-compile all|package] [--upgrade-type deprecate-only|mixed|delete] [-w
    <value>] [-f] [--continue-on-error] [--api-version <value>]

FLAGS
  -f, --force                           Bypass the check for already installed packages and force installation.
  -k, --installation-keys=<value>       Installation key(s) for protected package versions, specified as comma-separated
                                        pairs of "PackageAlias:key".
  -o, --target-org=<value>              (required) Target org to install the package dependencies into.
  -p, --package=<value>                 Package directory name from sfdx-project.json whose dependencies to install. If
                                        not specified, dependencies from all package directories are installed.
  -v, --target-dev-hub=<value>          Target DevHub org used to resolve package version IDs (04t) for dependencies
                                        defined by package ID (0Ho) and version number.
  -w, --wait=<value>                    [default: 0 minutes] Number of minutes to wait for each package installation to
                                        complete.
      --apex-compile=<option>           [default: all] Compile all Apex in the org and package, or only compile Apex in
                                        the package during installation.
                                        <options: all|package>
      --api-version=<value>             Override the api version used for api requests made by this command
      --continue-on-error               Continue installing remaining packages if a package installation fails.
      --installation-keys-file=<value>  Path to a JSON file containing an array of [{"PackageAlias": "key"}] mappings.
      --upgrade-type=<option>           [default: mixed] The upgrade type for package installation.
                                        <options: deprecate-only|mixed|delete>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install package dependencies defined in sfdx-project.json.

  Resolves and installs all direct package dependencies declared in sfdx-project.json into a target org. Supports
  resolving package version IDs (04t) directly from packageAliases or via DevHub query when using package IDs (0Ho) and
  version numbers.

ALIASES
  $ sf pkgm dependencies install

EXAMPLES
  Install dependencies for all package directories into default target org:

    $ sf package manager dependencies install

  Install dependencies for a specific package with a 30-minute timeout:

    $ sf package manager dependencies install -p MyPackage -w 30

  Install using installation keys from an environment variable or flag:

    $ sf package manager dependencies install -k "PkgA:key1,PkgB:key2"

  Force reinstallation of packages even if already installed in the target org:

    $ sf package manager dependencies install --force

  Continue installing remaining packages if one fails:

    $ sf package manager dependencies install --continue-on-error

  Use the shorthand alias:

    $ sf pkgm dependencies install -p MyPackage
```

_See code: [src/commands/package/manager/dependencies/install.ts](https://github.com/jucamola/sf-package-manager/blob/v1.0.0/src/commands/package/manager/dependencies/install.ts)_

## `sf pkgm dependencies install`

Install package dependencies defined in sfdx-project.json.

```
USAGE
  $ sf pkgm dependencies install -o <value> [--json] [--flags-dir <value>] [-v <value>] [-p <value>] [-k <value>]
    [--installation-keys-file <value>] [--apex-compile all|package] [--upgrade-type deprecate-only|mixed|delete] [-w
    <value>] [-f] [--continue-on-error] [--api-version <value>]

FLAGS
  -f, --force                           Bypass the check for already installed packages and force installation.
  -k, --installation-keys=<value>       Installation key(s) for protected package versions, specified as comma-separated
                                        pairs of "PackageAlias:key".
  -o, --target-org=<value>              (required) Target org to install the package dependencies into.
  -p, --package=<value>                 Package directory name from sfdx-project.json whose dependencies to install. If
                                        not specified, dependencies from all package directories are installed.
  -v, --target-dev-hub=<value>          Target DevHub org used to resolve package version IDs (04t) for dependencies
                                        defined by package ID (0Ho) and version number.
  -w, --wait=<value>                    [default: 0 minutes] Number of minutes to wait for each package installation to
                                        complete.
      --apex-compile=<option>           [default: all] Compile all Apex in the org and package, or only compile Apex in
                                        the package during installation.
                                        <options: all|package>
      --api-version=<value>             Override the api version used for api requests made by this command
      --continue-on-error               Continue installing remaining packages if a package installation fails.
      --installation-keys-file=<value>  Path to a JSON file containing an array of [{"PackageAlias": "key"}] mappings.
      --upgrade-type=<option>           [default: mixed] The upgrade type for package installation.
                                        <options: deprecate-only|mixed|delete>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install package dependencies defined in sfdx-project.json.

  Resolves and installs all direct package dependencies declared in sfdx-project.json into a target org. Supports
  resolving package version IDs (04t) directly from packageAliases or via DevHub query when using package IDs (0Ho) and
  version numbers.

ALIASES
  $ sf pkgm dependencies install

EXAMPLES
  Install dependencies for all package directories into default target org:

    $ sf pkgm dependencies install

  Install dependencies for a specific package with a 30-minute timeout:

    $ sf pkgm dependencies install -p MyPackage -w 30

  Install using installation keys from an environment variable or flag:

    $ sf pkgm dependencies install -k "PkgA:key1,PkgB:key2"

  Force reinstallation of packages even if already installed in the target org:

    $ sf pkgm dependencies install --force

  Continue installing remaining packages if one fails:

    $ sf pkgm dependencies install --continue-on-error

  Use the shorthand alias:

    $ sf pkgm dependencies install -p MyPackage
```

<!-- commandsstop -->
