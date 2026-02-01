#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="${ROOT_DIR}/public/vendor"

mkdir -p "${VENDOR_DIR}"

extract_pkg() {
  local pkg="$1"
  local version="$2"
  local src_path="$3"
  local dest_dir="$4"

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  (
    cd "${tmp_dir}"
    local tarball
    tarball="$(npm pack "${pkg}@${version}")"
    tar -xzf "${tarball}"
    mkdir -p "${dest_dir}"
    cp -R "package/${src_path}/." "${dest_dir}/"
  )
  rm -rf "${tmp_dir}"
}

echo "📦 Vendorizing transformers.js..."
extract_pkg "@huggingface/transformers" "3.1.1" "dist" "${VENDOR_DIR}/transformers/3.1.1"
extract_pkg "@huggingface/transformers" "3.7.3" "dist" "${VENDOR_DIR}/transformers/3.7.3"

echo "📦 Vendorizing onnxruntime-web..."
extract_pkg "onnxruntime-web" "1.20.1" "dist" "${VENDOR_DIR}/onnxruntime-web/1.20.1/dist"
extract_pkg "onnxruntime-web" "1.22.0-dev.20250409-89f8206ba4" "dist" "${VENDOR_DIR}/onnxruntime-web/1.22.0-dev.20250409-89f8206ba4/dist"

for ver in "1.20.1" "1.22.0-dev.20250409-89f8206ba4"; do
  mjs="${VENDOR_DIR}/onnxruntime-web/${ver}/dist/ort-wasm-simd-threaded.jsep.mjs"
  js="${VENDOR_DIR}/onnxruntime-web/${ver}/dist/ort-wasm-simd-threaded.jsep.js"
  if [ -f "${mjs}" ]; then
    cp "${mjs}" "${js}"
  fi
done

echo "✅ Vendor assets installed in ${VENDOR_DIR}"
