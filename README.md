# Direktiv Support by vorteil.io

Provides comprehensive Direktiv support to Visual Studio Code, via the use of YAML validation and REST api request to manage a remote Direktiv server.

## Features

- Direktion language helper.
- YAML Linting for Workflow input (provided by the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) and our custom JSON Schema.)
  - Detects invalid inputs
  - Offers suggestions for what to fill in
  - Provides auto-completion
- Workflows
  - Upload YAML file to remote Direktiv
  - Update YAML file to remote Direktiv
  - Execute Remote Workflow on Direktiv
  - Delete YAML file locally and remotely on Direktiv
- Namespaces
  - Contextually download all workflows to a folder 
- Activity Bar Direktiv
  - The ability to add multiple servers to view the Instances that have been run on Direktiv

## How To

In order to use any actions on the Workflow level you need to download all workflows from a namespace remotely to folder which will create a '.direktiv.manifest.json' file which contains details on what to do with the 'YAML' files on each action. 

## Contributing

If you would like to contribute make sure to follow the [semantic commit message guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format)
