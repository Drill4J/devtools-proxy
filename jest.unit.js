/* eslint-disable */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testMatch: ['**/__tests__/unit/**/*spec.+(ts)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['jest-extended'],
  globals: {
    'ts-jest': {
      tsConfig: './test.tsconfig.json',
      isolatedModules: true,
    },
  },
  collectCoverageFrom: ['src/**', '!**/node_modules/**'],
};
