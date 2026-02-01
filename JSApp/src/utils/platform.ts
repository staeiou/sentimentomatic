export function isIPadOS(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // iPad pre-iPadOS 13
  const isIPadUA = /\biPad\b/i.test(ua);
  // iPadOS 13+ reports as MacIntel but has touch points
  const isMacLikeTouch = platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;

  return isIPadUA || isMacLikeTouch;
}
