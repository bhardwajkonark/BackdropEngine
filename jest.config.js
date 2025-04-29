module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    rootDir: '.',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['<rootDir>/tests/**/*.test.(ts|tsx)'],
    setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
}; 