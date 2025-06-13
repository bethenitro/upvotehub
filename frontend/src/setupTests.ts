
// Setup file for Jest
import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';

// Mock global objects if needed
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Any other global mocks or setup code goes here
