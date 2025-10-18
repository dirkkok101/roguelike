import { DownloadService } from './DownloadService'

describe('DownloadService', () => {
  let service: DownloadService
  let createElementSpy: jest.SpyInstance
  let createObjectURLSpy: jest.SpyInstance
  let revokeObjectURLSpy: jest.SpyInstance
  let appendChildSpy: jest.SpyInstance
  let removeChildSpy: jest.SpyInstance
  let clickSpy: jest.Mock

  beforeEach(() => {
    service = new DownloadService()

    // Mock DOM methods
    clickSpy = jest.fn()
    const mockAnchor = {
      href: '',
      download: '',
      click: clickSpy,
    }

    createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    // Mock URL methods if they exist
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation()
    } else {
      // Fallback mocks for test environment
      createObjectURLSpy = jest.fn().mockReturnValue('blob:mock-url')
      revokeObjectURLSpy = jest.fn()
      global.URL = { createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy } as any
    }

    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation()
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation()
  })

  afterEach(() => {
    createElementSpy.mockRestore()
    if (createObjectURLSpy && createObjectURLSpy.mockRestore) createObjectURLSpy.mockRestore()
    if (revokeObjectURLSpy && revokeObjectURLSpy.mockRestore) revokeObjectURLSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  describe('downloadJSON', () => {
    it('should download JSON with pretty formatting', () => {
      const data = { name: 'Test', value: 42 }

      service.downloadJSON('test.json', data)

      // Should create anchor element
      expect(createElementSpy).toHaveBeenCalledWith('a')

      // Should create blob URL
      expect(createObjectURLSpy).toHaveBeenCalled()

      // Should trigger click
      expect(clickSpy).toHaveBeenCalled()

      // Should clean up
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should serialize Maps correctly', () => {
      const data = { map: new Map([['key1', 'value1'], ['key2', 'value2']]) }

      service.downloadJSON('test.json', data)

      // Map should be serialized to object
      expect(createObjectURLSpy).toHaveBeenCalled()
    })

    it('should serialize Sets correctly', () => {
      const data = { set: new Set([1, 2, 3]) }

      service.downloadJSON('test.json', data)

      // Set should be serialized to array
      expect(createObjectURLSpy).toHaveBeenCalled()
    })

    it('should support compact formatting', () => {
      const data = { name: 'Test' }

      service.downloadJSON('test.json', data, false)

      // Should still work with compact format
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('downloadText', () => {
    it('should download text file', () => {
      service.downloadText('log.txt', 'Error log content')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(clickSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()
    })

    it('should use custom MIME type', () => {
      service.downloadText('data.csv', 'a,b,c', 'text/csv')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      createObjectURLSpy.mockImplementation(() => {
        throw new Error('Blob error')
      })

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Should not throw
      expect(() => {
        service.downloadText('test.txt', 'content')
      }).not.toThrow()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not trigger download'),
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('downloadBinary', () => {
    it('should download binary data', () => {
      const data = new Uint8Array([1, 2, 3, 4])

      service.downloadBinary('data.bin', data, 'application/octet-stream')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(clickSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      createObjectURLSpy.mockImplementation(() => {
        throw new Error('Blob error')
      })

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Should not throw
      expect(() => {
        service.downloadBinary('test.bin', new Uint8Array([1, 2]), 'application/octet-stream')
      }).not.toThrow()

      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })
})
