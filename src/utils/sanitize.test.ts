import { escapeHtml } from './sanitize'

describe('escapeHtml', () => {
  it('should escape script tags', () => {
    const input = '<script>alert("xss")</script>'
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should escape ampersands', () => {
    const input = 'Tom & Jerry'
    const expected = 'Tom &amp; Jerry'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should escape single quotes', () => {
    const input = "It's dangerous"
    const expected = 'It&#039;s dangerous'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should escape all special characters', () => {
    const input = '<div class="test">A & B\'s "quote"</div>'
    const expected = '&lt;div class=&quot;test&quot;&gt;A &amp; B&#039;s &quot;quote&quot;&lt;/div&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should handle plain text without special characters', () => {
    const input = 'SimpleCharacterName'
    const expected = 'SimpleCharacterName'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should handle empty string', () => {
    const input = ''
    const expected = ''
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should prevent XSS via img tag', () => {
    const input = '<img src=x onerror=alert("xss")>'
    const expected = '&lt;img src=x onerror=alert(&quot;xss&quot;)&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should prevent XSS via event handler', () => {
    const input = '<div onclick="alert(\'xss\')">Click me</div>'
    const expected = '&lt;div onclick=&quot;alert(&#039;xss&#039;)&quot;&gt;Click me&lt;/div&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })
})
