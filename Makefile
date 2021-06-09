.SILENT:

mkfile_path_main := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir_main := $(dir $(mkfile_path_main))

VERSION := $(if $(ENV_VERSION),$(ENV_VERSION),0.0.1)
IMAGE_NAME := vorteil/vsce
TAG := latest

.PHONY: extension
extension: direktion build package

.PHONY: direktion
direktion:
	if [ ! -d ${mkfile_dir_main}direktion ]; then \
		git clone git@github.com:vorteil/direktion.git; \
	fi
	cd ${mkfile_dir_main}direktion && git pull && make direktion 
	cp direktion/build/direktion ./resources
	cp direktion/vscode/syntaxes/direktion.tmGrammar.json ./resources

.PHONY: build
build:
	docker build -t $(IMAGE_NAME):$(TAG) .

.PHONY: package
package:
	docker run --rm -v ${PWD}:/app $(IMAGE_NAME):$(TAG) package -o Direktiv.vsix
	sudo chown ${USER} Direktiv.vsix