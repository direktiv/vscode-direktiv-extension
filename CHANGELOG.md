# Change Log

All notable changes to the "direktiv" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.2] - 10-06-2021
- Added hotkeys for 
  - Save and Upload (ctrl+alt+s) 
  - Save, Upload and Execute (ctrl+alt+x)
  - Execute (shift+alt+x)
- Experimental new scripting language highly in development 
  - Ability to compile to YAML 
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