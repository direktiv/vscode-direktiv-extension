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
	if [ ! -d ${mkfile_dir_main}/upx ]; then \
		wget https://github.com/upx/upx/releases/latest/download/upx-3.96-amd64_linux.tar.xz; \
		tar -xvf upx-3.96-amd64_linux.tar.xz; \
		cp upx-3.96-amd64_linux/upx ./; \
		rm -rf upx-3.96-amd64_linux.tar.xz; \
	fi
	if [ ! -d ${mkfile_dir_main}direktion ]; then \
		git clone git@github.com:vorteil/direktion.git; \
	fi
	cd ${mkfile_dir_main}direktion && git pull
	cd direktion && go get -v && GOOS=linux go build -ldflags="-s -w" -o direktion-linux *.go && GOOS=windows go build -ldflags="-s -w" -o direktion-windows.exe *.go && GOOS=darwin go build -ldflags="-s -w" -o direktion-darwin *.go
	./upx direktion/direktion-linux && ./upx direktion/direktion-windows.exe && ./upx direktion/direktion-darwin
	cp direktion/direktion-linux ./resources && cp direktion/direktion-windows.exe ./resources && cp direktion/direktion-darwin ./resources
	cp direktion/vscode/syntaxes/direktion.tmGrammar.json ./resources

.PHONY: build
build:
	docker build -t $(IMAGE_NAME):$(TAG) .

.PHONY: package
package:
	docker run --rm -v ${PWD}:/app $(IMAGE_NAME):$(TAG) package -o Direktiv.vsix
	sudo chown ${USER} Direktiv.vsix