import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock console.warn for tests
global.console = {
  ...console,
  warn: vi.fn(),
};