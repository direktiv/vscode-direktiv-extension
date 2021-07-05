# Change Log

All notable changes to the "direktiv" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.7] - 05-07-2021
- Fixed a bug when downloading workflows if none existed it would never pull.
- Added direktion hotkeys
  - ctrl-alt-c Compile
  - ctrl-alt-g Compile and Upload
  - ctrl-alt-r Compile, Upload and Execute
- Removed Create Workflow. Push Workflow should now automatically create remotely if it doesn't exist.
- Fixed a bug where compiling Direktion didnt not compile to the appropriate file.
- Added input and output to the Instance logs
- Fixed bad YAML linting 
- Updated YAML to handle new JQ interpretations with transform.
## [0.0.6] - 22-06-2021
- Improved syntax highlighting.
## [0.0.5] - 22-06-2021
- Fixed a bug with the yaml schema not intepreting 'catch' field correctly.
## [0.0.4] - 11-06-2021
- Hotfixed a bug with the yaml schema we're using with Direktiv
- Changed contexual menu for workflows added an extra command
  - Pull Workflow pulls the remote workflow into the file.
## [0.0.3] - 10-06-2021
- Hotfixed bug with on save for other files.
## [0.0.2] - 10-06-2021
- Added hotkeys for 
  - Save and Upload (ctrl+alt+s) 
  - Save, Upload and Execute (ctrl+alt+x)
  - Execute (shift+alt+x)
## [0.0.1] - 04-06-2021
### Added
- The ability to download all workflows from a namespace on a folder contextually.
- Context changes to the files that contain '.direktiv.yaml'
  - 'Upload Workflow' uploads the yaml file to the direktiv server
  - 'Update Workflow' pushes workflow remotely 
  - 'Execute Workflow' executes the workflow to create instances
  - 'Delete Workflow' deletes remotely and locally.
- Added an Activity bar for Direktiv
  - List instances per url/namespace
