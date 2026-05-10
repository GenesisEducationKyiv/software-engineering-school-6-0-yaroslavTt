/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    coverageDirectory: '<rootDir>/coverage',
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    coveragePathIgnorePatterns: [
        '<rootDir>/src/config',
        '<rootDir>/src/constants',
        '<rootDir>/src/test',
        '.exception.ts',
        '.repo.ts',
        '.dto.ts',
        '.d.ts',
    ],
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '.*\\.test\\.ts$',
    modulePaths: ['<rootDir>'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '@config/(.*)': '<rootDir>/src/config/$1',
        '@constants/(.*)': '<rootDir>/src/constants/$1',
        '@db/(.*)': '<rootDir>/src/db/$1',
        '@domains/(.*)': '<rootDir>/src/domains/$1',
        '@exceptions/(.*)': '<rootDir>/src/exceptions/$1',
        '@middlewares/(.*)': '<rootDir>/src/middlewares/$1',
        '@utilities/(.*)': '<rootDir>/src/utilities/$1',
        '@test/(.*)': '<rootDir>/src/test/$1',
    },
};
