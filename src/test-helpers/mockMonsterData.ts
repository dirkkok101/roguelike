import { MonsterTemplate } from '@game/core/core'

// ============================================================================
// MOCK MONSTER DATA HELPERS FOR TESTING
// ============================================================================

/**
 * Add default spriteName to monster template if missing
 *
 * This helper ensures test monster mocks work with the sprite rendering system.
 * The spriteName field is required by MonsterSpawnService validation but most
 * test mocks were created before sprite rendering was implemented.
 *
 * @param template - Monster template (may be missing spriteName)
 * @returns Template with spriteName added if missing
 */
export function ensureSpriteName(template: Partial<MonsterTemplate> & { letter: string; name: string }): MonsterTemplate {
  return {
    ...template,
    spriteName: template.spriteName || template.name, // Use name as sprite name if not provided
  } as MonsterTemplate
}

/**
 * Add default spriteNames to array of monster templates
 *
 * @param templates - Array of monster templates (may be missing spriteName)
 * @returns Templates with spriteName added to each
 */
export function ensureSpriteNames(templates: Array<Partial<MonsterTemplate> & { letter: string; name: string }>): MonsterTemplate[] {
  return templates.map(ensureSpriteName)
}

/**
 * Create mock monster data for fetch responses
 *
 * @param templates - Array of monster templates (spriteName will be auto-added)
 * @returns Mock fetch response with monster data
 */
export function createMockMonsterFetch(templates: Array<Partial<MonsterTemplate> & { letter: string; name: string }>) {
  return {
    ok: true,
    json: async () => ensureSpriteNames(templates),
  } as Response
}
