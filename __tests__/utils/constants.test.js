import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import crypto from 'crypto';

describe('Constants', () => {
   let mockAppRoot;
   let mockDotenv;
   let mockOs;
   let mockCrypto;

   beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();

      mockAppRoot = { path: '/test/root' };

      mockDotenv = {
         config: vi.fn(),
      };

      mockOs = {
         platform: vi.fn(),
      };

      mockCrypto = {
         createDecipheriv: vi.fn(),
      };

      vi.doMock('app-root-path', () => ({ default: mockAppRoot }));
      vi.doMock('dotenv', () => ({ default: mockDotenv }));
      vi.doMock('os', () => ({ default: mockOs }));
   });

   afterEach(() => {
      vi.restoreAllMocks();
   });

   describe('init - successful initialization', () => {
      it('should initialize all constants with valid environment files', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         const Constants = await import('../../src/utils/constants.js');

         expect(Constants.default.PROJECT_NAME).toBe('TestProject');
         expect(Constants.default.RUNNING_ENVIRONMENT).toBe('dev');
         expect(Constants.default.GENESYS_ENDPOINT_URL).toBe('https://api.example.com');
         expect(Constants.default.DEFAULT_API_PAGE_SIZE).toBe(100);
         expect(Constants.default.SQL_DATABASE).toBe('testdb');
         expect(Constants.default.EMAIL_HOST).toBe('smtp.example.com');
         expect(Constants.default.EMAIL_PORT).toBe(587);
         expect(Constants.default.EMAIL_USER).toBe('test@example.com');
         expect(Constants.default.EMAIL_DEFAULT_FROM).toBe('noreply@example.com');
         expect(Constants.default.SQL_SERVER).toBe('localhost');
         expect(Constants.default.SQL_USER).toBe('dbuser');
         expect(Constants.default.SQL_PORT).toBe('1433');
         expect(Constants.default.EMAIL_RECIPIENTS).toBe('admin@example.com');
         expect(Constants.default.ROOT_FOLDER).toBe('/test/root');
      });

      it('should handle Windows platform for IVR path', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'prod',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '50',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('win32');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         const Constants = await import('../../src/utils/constants.js');

         expect(Constants.default.IVR_ATTRIBUTE_FILE_PATH).toBe('D:\\GenesysIVRFiles\\');
      });

      it('should handle non-Windows platform for IVR path', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('linux');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         const Constants = await import('../../src/utils/constants.js');

         expect(Constants.default.IVR_ATTRIBUTE_FILE_PATH).toBe(path.join('/test/root', 'GenesysIVRFiles'));
      });

      it('should handle optional EMAIL_CC_RECIPIENTS', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
            EMAIL_CC_RECIPIENTS: 'cc@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         const Constants = await import('../../src/utils/constants.js');

         expect(Constants.default.EMAIL_CC_RECIPIENTS).toBe('cc@example.com');
      });

      it('should set empty string for missing EMAIL_CC_RECIPIENTS', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         const Constants = await import('../../src/utils/constants.js');

         expect(Constants.default.EMAIL_CC_RECIPIENTS).toBe('');
      });
   });

   describe('init - environment name extraction', () => {
      it('should strip trailing numbers from environment name', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'prod1',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         await import('../../src/utils/constants.js');

         expect(mockDotenv.config.mock.calls[1][0].path).toContain('.env.prod');
      });

      it('should handle environment name without trailing numbers', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'development',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const mockDecipher = {
            setAuthTag: vi.fn(),
            update: vi.fn().mockReturnValue('decrypted'),
            final: vi.fn().mockReturnValue('Value'),
         };

         vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

         await import('../../src/utils/constants.js');

         expect(mockDotenv.config.mock.calls[1][0].path).toContain('.env.development');
      });
   });

   describe('init - error handling for env file loading', () => {
      it('should throw error when general .env file fails to load', async () => {
         mockDotenv.config.mockReturnValueOnce({
            error: new Error('File not found'),
         });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Failed to load environment file: .env'),
         );

         consoleErrorSpy.mockRestore();
      });

      it('should throw error when general .env file is empty', async () => {
         mockDotenv.config.mockReturnValueOnce({
            parsed: {},
         });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Environment file is empty or invalid: .env'),
         );

         consoleErrorSpy.mockRestore();
      });

      it('should throw error when general .env parsed is null', async () => {
         mockDotenv.config.mockReturnValueOnce({
            parsed: null,
         });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         consoleErrorSpy.mockRestore();
      });

      it('should throw error when specific env file fails to load', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         mockDotenv.config
            .mockReturnValueOnce({ parsed: generalEnvData })
            .mockReturnValueOnce({ error: new Error('File not found') });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Failed to load environment file: .env.dev'),
         );

         consoleErrorSpy.mockRestore();
      });

      it('should throw error when RUNNING_ENVIRONMENT is missing', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: 'key',
            ENCRYPT_IV: 'iv',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('RUNNING_ENVIRONMENT is required'),
         );

         consoleErrorSpy.mockRestore();
      });

      it('should throw error when RUNNING_ENVIRONMENT is empty string', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: '',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: 'key',
            ENCRYPT_IV: 'iv',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         consoleErrorSpy.mockRestore();
      });
   });

   describe('init - validation errors', () => {
      it('should throw error when required general variables are missing', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Missing required environment variables'),
         );

         consoleErrorSpy.mockRestore();
      });

      it('should throw error when required specific variables are missing', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            SQL_SERVER: 'localhost',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Missing required environment variables'),
         );

         consoleErrorSpy.mockRestore();
      });
   });

   describe('init - integer parsing errors', () => {
      it('should throw error for invalid DEFAULT_API_PAGE_SIZE', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: 'not a number',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Invalid integer value for DEFAULT_API_PAGE_SIZE'),
         );

         consoleErrorSpy.mockRestore();
      });

      it('should throw error for zero DEFAULT_API_PAGE_SIZE', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '0',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         consoleErrorSpy.mockRestore();
      });

      it('should throw error for negative DEFAULT_API_PAGE_SIZE', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '-10',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         consoleErrorSpy.mockRestore();
      });

      it('should throw error for invalid EMAIL_PORT', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: 'invalid',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Invalid integer value for EMAIL_PORT'),
         );

         consoleErrorSpy.mockRestore();
      });
   });

   describe('init - decryption errors', () => {
      it('should throw error when decryption fails', async () => {
         const generalEnvData = {
            PROJECT_NAME: 'TestProject',
            RUNNING_ENVIRONMENT: 'dev',
            GENESYS_ENDPOINT_URL: 'https://api.example.com',
            DEFAULT_API_PAGE_SIZE: '100',
            SQL_DATABASE: 'testdb',
            EMAIL_HOST: 'smtp.example.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'test@example.com',
            EMAIL_PW_TAG: 'tag1',
            EMAIL_PW_ENCRYPTED: 'encrypted1',
            EMAIL_DEFAULT_FROM: 'noreply@example.com',
            ENCRYPT_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ENCRYPT_IV: '0123456789abcdef0123456789abcdef',
         };

         const specificEnvData = {
            GENESYS_CLIENT_ID_TAG: 'tag2',
            GENESYS_CLIENT_ID_ENCRYPTED: 'encrypted2',
            GENESYS_CLIENT_SECRET_TAG: 'tag3',
            GENESYS_CLIENT_SECRET_ENCRYPTED: 'encrypted3',
            SQL_SERVER: 'localhost',
            SQL_USER: 'dbuser',
            SQL_PORT: '1433',
            SQL_PW_TAG: 'tag4',
            SQL_PW_ENCRYPTED: 'encrypted4',
            EMAIL_RECIPIENTS: 'admin@example.com',
         };

         mockDotenv.config.mockReturnValueOnce({ parsed: generalEnvData }).mockReturnValueOnce({ parsed: specificEnvData });

         mockOs.platform.mockReturnValue('darwin');

         vi.spyOn(crypto, 'createDecipheriv').mockImplementation(() => {
            throw new Error('Decryption failed');
         });

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         await expect(async () => {
            await import('../../src/utils/constants.js');
         }).rejects.toThrow();

         expect(consoleErrorSpy).toHaveBeenCalledWith(
            'FATAL: Constants initialization failed',
            expect.stringContaining('Failed to decrypt field'),
         );

         consoleErrorSpy.mockRestore();
      });
   });
});
