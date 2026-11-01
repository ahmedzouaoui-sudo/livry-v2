/**
 * Lightweight Haptic Feedback utility for mobile touch devices.
 * Uses navigator.vibrate where supported (Android Chrome, PWA, mobile WebKit where enabled).
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') {
        navigator.vibrate(8);
      } else if (type === 'medium') {
        navigator.vibrate(15);
      } else if (type === 'success') {
        navigator.vibrate([10, 30, 15]);
      } else if (type === 'warning') {
        navigator.vibrate([20, 40, 20]);
      }
    } catch {
      // Ignore vibration errors on unsupported platforms
    }
  }
}
