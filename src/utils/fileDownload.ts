/**
 * Cross-browser, iOS Safari, Android WebView & iframe-safe file download helper.
 * Delays revoking the object URL so downloads are never cancelled prematurely.
 */
export function triggerFileDownload(
  content: string | Blob,
  filename: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    try {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch {}
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 2000);
}

/**
 * Triggers a CSV download with UTF-8 BOM (\uFEFF) so Microsoft Excel
 * automatically renders French accents and special characters cleanly.
 */
export function triggerCsvDownload(csvBody: string, filename: string): void {
  const withBom = csvBody.startsWith('\uFEFF') ? csvBody : '\uFEFF' + csvBody;
  triggerFileDownload(withBom, filename, 'text/csv;charset=utf-8;');
}
