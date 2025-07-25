import { vi } from 'vitest';

// Mock Chrome Extension APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
} as any;

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Mock DOM APIs commonly used in content scripts
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn((element: HTMLElement) => {
    const style = element.style;
    return {
      display: style.display || 'block',
      visibility: style.visibility || 'visible',
      opacity: style.opacity || '1',
    };
  }),
});

// Mock getBoundingClientRect
HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: vi.fn(),
}));

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
}));