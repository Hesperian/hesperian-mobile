IMAGE_NAME ?= hesperian-mobile
DOCKERFILE ?= Dockerfile.webpack
DOCKERFILE_ANDROID ?= Dockerfile.android
ANDROID_IMAGE_NAME ?= hesperian-mobile-android
TAG ?= latest

.PHONY: build

build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME):$(TAG) .

# linux/arm64/v8
build-android:
	docker build --no-cache -f $(DOCKERFILE_ANDROID) -t $(ANDROID_IMAGE_NAME):$(TAG) .