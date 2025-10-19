export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__test-utils__/jestSetup.ts'],
  moduleNameMapper: {
    // Mock CSS imports
    '\\.css$': '<rootDir>/src/__test-utils__/styleMock.js',
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@states/(.*)$': '<rootDir>/src/states/$1',
    '^@factories/(.*)$': '<rootDir>/src/factories/$1',
    '^@game/(.*)$': '<rootDir>/src/types/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@test-utils/(.*)$': '<rootDir>/src/__test-utils__/$1',
    '^@test-helpers$': '<rootDir>/src/test-helpers',
    '^@test-helpers/(.*)$': '<rootDir>/src/test-helpers/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
