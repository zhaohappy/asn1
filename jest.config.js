module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/'],
  testMatch: ['<rootDir>/__test__/**/*.test.ts'],
  setupFiles: ['<rootDir>/__test__/setup.jest.ts']
};
