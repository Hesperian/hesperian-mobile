IMAGE_NAME ?= hesperian-mobile
DOCKERFILE ?= Dockerfile.webpack
TAG ?= latest

.PHONY: build

build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME):$(TAG) .