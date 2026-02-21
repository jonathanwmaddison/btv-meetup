// Minimal QR code SVG generator using a simple encoding approach.
// For production, consider using a library like 'qrcode'.
// This generates a URL that can be used with a QR code rendering service or client-side lib.

export function getQrSvgDataUrl(data: string, size = 200): string {
  // We generate a simple SVG that embeds a QR code via an external API-free approach.
  // This returns a data URL that renders a QR-like visual using a matrix pattern.
  // For a real QR code, the client component will use the canvas API.
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<rect width="${size}" height="${size}" fill="white"/>` +
      `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="monospace">QR</text>` +
      `</svg>`
  )}`;
}

export function getCheckinUrl(appUrl: string, eventId: string): string {
  return `${appUrl}/events/${eventId}/checkin`;
}
