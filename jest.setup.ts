import '@testing-library/jest-dom'

// Mock ResizeObserver (used by some UI libraries like react-zoom-pan-pinch or radix)
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})

// Suppress console errors during tests (optional, but keeps output clean if expected errors occur)
// const originalError = console.error
// console.error = (...args) => {
//   if (/Warning.*not wrapped in act/.test(args[0])) return
//   originalError(...args)
// }
