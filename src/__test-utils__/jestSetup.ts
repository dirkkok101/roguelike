// Jest setup file - mocks modules that can't be parsed by Jest
// This file is loaded before each test file via jest.config.js setupFilesAfterEnv

// Mock Worker services that use import.meta.url (not supported by Jest)
jest.mock('@services/CompressionWorkerService/CompressionWorkerService')
jest.mock('@services/SerializationWorkerService/SerializationWorkerService')
