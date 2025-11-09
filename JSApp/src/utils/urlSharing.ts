/**
 * URL Sharing Utilities
 *
 * Enables sharing text and model selections via compressed URL parameters.
 * Uses Brotli Level 11 compression for maximum URL length reduction.
 */

import brotliPromise from 'brotli-wasm';

let brotli: any = null;

/**
 * Initialize the Brotli WASM module
 */
async function initBrotli(): Promise<void> {
  if (!brotli) {
    brotli = await brotliPromise;
  }
}

/**
 * Convert Uint8Array to URL-safe base64 string
 */
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');

  return btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert URL-safe base64 string to Uint8Array
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  // Convert URL-safe base64 back to standard base64
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Share data structure
 */
export interface ShareData {
  text: string;
  models?: string[];
}

/**
 * Compress and encode text for URL sharing
 */
export async function encodeForUrl(data: ShareData): Promise<string> {
  await initBrotli();

  // Create JSON payload
  const payload = JSON.stringify(data);
  const textBytes = new TextEncoder().encode(payload);

  // Compress with Brotli Level 11 (maximum compression)
  const compressed = brotli.compress(textBytes, {
    quality: 11
  });

  // Encode to URL-safe base64
  const encoded = uint8ArrayToBase64Url(compressed);

  return encoded;
}

/**
 * Decode and decompress URL parameter
 */
export async function decodeFromUrl(encoded: string): Promise<ShareData | null> {
  try {
    await initBrotli();

    // Decode from URL-safe base64
    const compressed = base64UrlToUint8Array(encoded);

    // Decompress with Brotli
    const decompressed = brotli.decompress(compressed);

    // Convert back to string
    const payload = new TextDecoder().decode(decompressed);

    // Parse JSON
    const data = JSON.parse(payload) as ShareData;

    return data;
  } catch (error) {
    console.error('Failed to decode share URL:', error);
    return null;
  }
}

/**
 * Generate a shareable URL with the current text and models
 */
export async function generateShareUrl(data: ShareData): Promise<string> {
  const encoded = await encodeForUrl(data);

  const url = new URL(window.location.href);
  url.search = ''; // Clear existing params
  url.searchParams.set('share', encoded);

  return url.toString();
}

/**
 * Load share data from URL parameters if present
 */
export async function loadFromUrl(): Promise<ShareData | null> {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('share');

  if (!encoded) {
    return null;
  }

  return await decodeFromUrl(encoded);
}

/**
 * Clean URL by removing share parameter (for cleaner browser history)
 */
export function cleanUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.toString());
}
