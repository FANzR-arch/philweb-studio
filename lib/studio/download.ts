export function downloadBytes(filename: string, bytes: Uint8Array, mime = 'application/zip'): void {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  downloadBytes(filename, new TextEncoder().encode(text), mime);
}
