/**
 * DownloadService - Browser file download functionality
 *
 * Purpose: Encapsulates browser APIs for downloading files (Blob, URL, DOM manipulation).
 * This keeps browser-specific code out of services and commands.
 *
 * Usage:
 * ```typescript
 * const downloadService = new DownloadService()
 * downloadService.downloadJSON('replay.json', replayData)
 * downloadService.downloadText('log.txt', 'Error log contents...')
 * ```
 *
 * **Architecture**: This is a UI-layer service that wraps browser APIs.
 * It's acceptable for this to use `document` and `URL` since that's its purpose.
 */
export class DownloadService {
  /**
   * Download JSON data as a file
   *
   * @param filename - Name of the file to download
   * @param data - Data to serialize to JSON
   * @param pretty - Whether to pretty-print JSON (default: true)
   *
   * @example
   * downloadService.downloadJSON('replay-game-123.json', replayData)
   */
  downloadJSON(filename: string, data: any, pretty: boolean = true): void {
    const json = JSON.stringify(
      data,
      (_key, value) => {
        // Handle Map/Set serialization
        if (value instanceof Map) {
          return Object.fromEntries(value)
        }
        if (value instanceof Set) {
          return Array.from(value)
        }
        return value
      },
      pretty ? 2 : undefined
    )

    this.downloadText(filename, json, 'application/json')
  }

  /**
   * Download text content as a file
   *
   * @param filename - Name of the file to download
   * @param content - Text content to download
   * @param mimeType - MIME type (default: 'text/plain')
   *
   * @example
   * downloadService.downloadText('log.txt', 'Error occurred...', 'text/plain')
   */
  downloadText(filename: string, content: string, mimeType: string = 'text/plain'): void {
    try {
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename

      // Append to body to ensure it works in all browsers
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up blob URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('Could not trigger download:', error)
      console.log('💡 Copy the content from console instead')
    }
  }

  /**
   * Download binary data as a file
   *
   * @param filename - Name of the file to download
   * @param data - Binary data to download
   * @param mimeType - MIME type (e.g., 'application/octet-stream')
   *
   * @example
   * downloadService.downloadBinary('save.dat', saveData, 'application/octet-stream')
   */
  downloadBinary(filename: string, data: Uint8Array, mimeType: string): void {
    try {
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('Could not trigger download:', error)
    }
  }
}
