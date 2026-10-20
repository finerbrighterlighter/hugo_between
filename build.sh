#!/usr/bin/env bash

#------------------------------------------------------------------------------
# Builds htunteza.com for a Cloudflare Worker with static assets (wrangler.jsonc).
# Adapted from https://gohugo.io/host-and-deploy/deploy-to-cloudflare/
#
# The site needs only Hugo extended: no Dart Sass, Go modules or Node packages.
# HUGO_VERSION is the site's one Hugo pin. scripts/check-hugo.js reads it, and
# the GitHub workflows must install the same version.
#------------------------------------------------------------------------------

set -euo pipefail

HUGO_VERSION=0.168.0

# Same zone as params.timezone in hugo.toml.
TZ=Asia/Bangkok

# The path Cloudflare's build cache keeps between builds.
HUGO_CACHEDIR="${PWD}/.cache/hugo"

cleanup() {
  if [[ -n "${build_temp_dir:-}" && -d "${build_temp_dir}" ]]; then
    rm -rf "${build_temp_dir}"
  fi
}

trap cleanup EXIT SIGINT SIGTERM

main() {
  export TZ
  export HUGO_CACHEDIR

  build_temp_dir=$(mktemp -d)
  mkdir -p "${HOME}/.local/hugo"

  echo "Installing Hugo extended ${HUGO_VERSION}..."
  curl -sfL --output-dir "${build_temp_dir}" -O \
    "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
  tar -C "${HOME}/.local/hugo" -xf "${build_temp_dir}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
  export PATH="${HOME}/.local/hugo:${PATH}"

  echo "Verifying installation..."
  hugo version

  echo "Configuring Git..."
  git config core.quotepath false
  if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
    git fetch --unshallow
  fi

  echo "Building the project..."
  hugo --gc --minify
}

main "$@"
