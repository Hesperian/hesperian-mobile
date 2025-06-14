#!/bin/bash 
docker run -v "$(pwd)":/app/webpack -w /app/webpack hesperian-mobile make web