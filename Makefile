.SILENT:

mkfile_path_main := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir_main := $(dir $(mkfile_path_main))

VERSION := $(if $(ENV_VERSION),$(ENV_VERSION),0.0.1)
IMAGE_NAME := vorteil/vsce
TAG := latest

.PHONY: extension
extension:  build package

.PHONY: build
build:
	yarn install
	yarn compile
	docker build -t $(IMAGE_NAME):$(TAG) .

.PHONY: package
package:
	docker run --rm -v ${PWD}:/app $(IMAGE_NAME):$(TAG) package -o Direktiv.vsix
	sudo chown ${USER} out
	sudo chown -R ${USER} out/*.js
	sudo chown ${USER} Direktiv.vsix