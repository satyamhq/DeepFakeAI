#!/usr/bin/env sh

# Only do the auto-fix parts of eslint, and don't fail on errors while staging files
npx eslint --fix "$@" || true
