# summary

Install package dependencies defined in sfdx-project.json.

# description

Resolves and installs all direct package dependencies declared in sfdx-project.json into a target org. Supports resolving package version IDs (04t) directly from packageAliases or via DevHub query when using package IDs (0Ho) and version numbers.

# examples

- Install dependencies for all package directories into default target org:
  <%= config.bin %> <%= command.id %>

- Install dependencies for a specific package with a 30-minute timeout:
  <%= config.bin %> <%= command.id %> -p MyPackage -w 30

- Install using installation keys from an environment variable or flag:
  <%= config.bin %> <%= command.id %> -k "PkgA:key1,PkgB:key2"

- Force reinstallation of packages even if already installed in the target org:
  <%= config.bin %> <%= command.id %> --force

- Continue installing remaining packages if one fails:
  <%= config.bin %> <%= command.id %> --continue-on-error

- Use the shorthand alias:
  <%= config.bin %> pkgm dependencies install -p MyPackage

# flags.target-org.summary

Target org to install the package dependencies into.

# flags.target-dev-hub.summary

Target DevHub org used to resolve package version IDs (04t) for dependencies defined by package ID (0Ho) and version number.

# flags.package.summary

Package directory name from sfdx-project.json whose dependencies to install. If not specified, dependencies from all package directories are installed.

# flags.installation-keys.summary

Installation key(s) for protected package versions, specified as comma-separated pairs of "PackageAlias:key".

# flags.installation-keys-file.summary

Path to a JSON file containing an array of [{"PackageAlias": "key"}] mappings.

# flags.apex-compile.summary

Compile all Apex in the org and package, or only compile Apex in the package during installation.

# flags.upgrade-type.summary

The upgrade type for package installation.

# flags.wait.summary

Number of minutes to wait for each package installation to complete.

# flags.force.summary

Bypass the check for already installed packages and force installation.

# flags.continue-on-error.summary

Continue installing remaining packages if a package installation fails.

# info.noDependencies

No package dependencies found to install in sfdx-project.json.

# info.dependenciesFound

Found %s dependenc(ies) to process.

# info.resolvingDependencies

Resolving package dependencies from sfdx-project.json...

# error.installationFailed

One or more package dependencies failed to install.
