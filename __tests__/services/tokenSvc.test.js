import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenSvc } from '../../src/services/tokenSvc.js';
import FileManager from '../../src/utils/fileManager.js';

vi.mock('../../src/utils/constants.js', () => ({
   default: {
      ROOT_FOLDER: '/mock/root',
      GENESYS_CLIENT_ID: 'mock-client-id',
      GENESYS_CLIENT_SECRET: 'mock-client-secret',
   },
}));

vi.mock('../../src/utils/fileManager.js', () => ({
   default: {
      readFileAsync: vi.fn(),
      writeFileAsync: vi.fn(),
      doesPathExistAsync: vi.fn(),
      deleteFileAsync: vi.fn(),
   },
}));

describe('TokenSvc', () => {
   let tokenSvc;
   let mockAxiosSvc;

   beforeEach(() => {
      mockAxiosSvc = {
         sendRequestAsync: vi.fn(),
      };

      tokenSvc = new TokenSvc({
         axiosService: mockAxiosSvc,
         tokenFilePath: '/mock/token/path',
      });

      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance with default configuration', () => {
         const service = new TokenSvc();
         expect(service).toBeInstanceOf(TokenSvc);
      });

      it('should create instance with custom axios service', () => {
         const customAxios = { sendRequestAsync: vi.fn() };
         const service = new TokenSvc({ axiosService: customAxios });
         expect(service).toBeInstanceOf(TokenSvc);
      });

      it('should create instance with custom token file path', () => {
         const service = new TokenSvc({ tokenFilePath: '/custom/path' });
         expect(service).toBeInstanceOf(TokenSvc);
      });
   });

   describe('getValidTokenAsync - Cached Token', () => {
      it('should return cached token if file exists and is valid', async () => {
         const mockTokenInfo = {
            access_token: 'cached-token-123',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce(mockTokenInfo);

         const token = await tokenSvc.getValidTokenAsync();

         expect(token).toBe('cached-token-123');
         expect(FileManager.readFileAsync).toHaveBeenCalledWith('/mock/token/path', 'json');
         expect(FileManager.readFileAsync).toHaveBeenCalledTimes(1);
         expect(mockAxiosSvc.sendRequestAsync).not.toHaveBeenCalled();
      });
   });

   describe('getValidTokenAsync - Fetch New Token', () => {
      it('should fetch new token if cached file is empty', async () => {
         const mockNewToken = {
            access_token: 'new-token-456',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(mockNewToken);

         const token = await tokenSvc.getValidTokenAsync();

         expect(token).toBe('new-token-456');
         expect(FileManager.readFileAsync).toHaveBeenCalledWith('/mock/token/path', 'json');
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(1);
         expect(FileManager.writeFileAsync).toHaveBeenCalledWith('/mock/token/path', 'json', mockNewToken);
      });

      it('should make correct API request when fetching token', async () => {
         const mockNewToken = {
            access_token: 'new-token-789',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(mockNewToken);

         await tokenSvc.getValidTokenAsync();

         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledWith(
            expect.objectContaining({
               method: 'POST',
               baseURL: 'https://login.cac1.pure.cloud',
               url: '/oauth/token',
               params: { grant_type: 'client_credentials' },
               headers: expect.objectContaining({
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Authorization: expect.stringMatching(/^Basic /),
               }),
            }),
         );
      });

      it('should include correct Basic Auth header', async () => {
         const mockNewToken = {
            access_token: 'token-with-auth',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(mockNewToken);

         await tokenSvc.getValidTokenAsync();

         const callArgs = mockAxiosSvc.sendRequestAsync.mock.calls[0][0];
         const authHeader = callArgs.headers.Authorization;

         expect(authHeader).toMatch(/^Basic /);
         const base64Part = authHeader.replace('Basic ', '');
         const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
         expect(decoded).toBe('mock-client-id:mock-client-secret');
      });
   });

   describe('getValidTokenAsync - Lazy Loading AxiosSvc', () => {
      it('should lazy load axiosSvc when not injected', async () => {
         const serviceWithoutAxios = new TokenSvc({ tokenFilePath: '/test/path' });

         FileManager.readFileAsync.mockResolvedValueOnce({});

         const mockModule = {
            default: {
               sendRequestAsync: vi.fn().mockResolvedValue({
                  access_token: 'lazy-loaded-token',
                  token_type: 'bearer',
                  expires_in: 3600,
               }),
            },
         };

         vi.doMock('../../src/services/axiosSvc.js', () => mockModule);

         await expect(serviceWithoutAxios.getValidTokenAsync()).resolves.toBeDefined();

         vi.doUnmock('../../src/services/axiosSvc.js');
      });
   });

   describe('getValidTokenAsync - Error Handling', () => {
      it('should throw error if file reading fails', async () => {
         const mockError = new Error('File read error');
         FileManager.readFileAsync.mockRejectedValueOnce(mockError);

         await expect(tokenSvc.getValidTokenAsync()).rejects.toMatchObject({
            message: expect.stringContaining('Getting Valid Token ERROR'),
         });
      });

      it('should throw error if token fetching fails', async () => {
         const mockError = new Error('API error');
         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockRejectedValueOnce(mockError);

         await expect(tokenSvc.getValidTokenAsync()).rejects.toThrow();
      });

      it('should throw error if writing token file fails', async () => {
         const mockNewToken = {
            access_token: 'new-token',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(mockNewToken);
         FileManager.writeFileAsync.mockRejectedValueOnce(new Error('Write error'));

         await expect(tokenSvc.getValidTokenAsync()).rejects.toThrow();
      });
   });

   describe('cleanTokenAsync', () => {
      it('should delete token file if it exists', async () => {
         FileManager.doesPathExistAsync.mockResolvedValueOnce(true);

         await tokenSvc.cleanTokenAsync();

         expect(FileManager.doesPathExistAsync).toHaveBeenCalledWith('/mock/token/path', 'json');
         expect(FileManager.deleteFileAsync).toHaveBeenCalledWith('/mock/token/path.json');
      });

      it('should not delete if token file does not exist', async () => {
         FileManager.doesPathExistAsync.mockResolvedValueOnce(false);

         await tokenSvc.cleanTokenAsync();

         expect(FileManager.doesPathExistAsync).toHaveBeenCalledWith('/mock/token/path', 'json');
         expect(FileManager.deleteFileAsync).not.toHaveBeenCalled();
      });

      it('should handle deletion errors gracefully', async () => {
         FileManager.doesPathExistAsync.mockResolvedValueOnce(true);
         FileManager.deleteFileAsync.mockRejectedValueOnce(new Error('Delete error'));

         await expect(tokenSvc.cleanTokenAsync()).rejects.toThrow();
      });
   });

   describe('Token Caching Flow', () => {
      it('should cache token after first fetch', async () => {
         const mockNewToken = {
            access_token: 'cached-after-fetch',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(mockNewToken);

         await tokenSvc.getValidTokenAsync();

         expect(FileManager.writeFileAsync).toHaveBeenCalledWith('/mock/token/path', 'json', mockNewToken);
      });

      it('should not fetch token again if cache is valid', async () => {
         const mockCachedToken = {
            access_token: 'valid-cached-token',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValue(mockCachedToken);

         await tokenSvc.getValidTokenAsync();
         await tokenSvc.getValidTokenAsync();

         expect(mockAxiosSvc.sendRequestAsync).not.toHaveBeenCalled();
         expect(FileManager.readFileAsync).toHaveBeenCalledTimes(2);
      });
   });

   describe('Token Refresh Scenario', () => {
      it('should handle token refresh workflow', async () => {
         const oldToken = {
            access_token: 'old-token',
            token_type: 'bearer',
            expires_in: 3600,
         };
         const newToken = {
            access_token: 'refreshed-token',
            token_type: 'bearer',
            expires_in: 3600,
         };

         FileManager.readFileAsync.mockResolvedValueOnce(oldToken);
         const token1 = await tokenSvc.getValidTokenAsync();
         expect(token1).toBe('old-token');

         FileManager.doesPathExistAsync.mockResolvedValueOnce(true);
         await tokenSvc.cleanTokenAsync();
         expect(FileManager.deleteFileAsync).toHaveBeenCalled();

         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(newToken);

         const token2 = await tokenSvc.getValidTokenAsync();
         expect(token2).toBe('refreshed-token');
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(1);
      });
   });

   describe('Static Configuration', () => {
      it('should use correct OAuth endpoint', async () => {
         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            access_token: 'test-token',
            token_type: 'bearer',
            expires_in: 3600,
         });

         await tokenSvc.getValidTokenAsync();

         const request = mockAxiosSvc.sendRequestAsync.mock.calls[0][0];
         expect(request.baseURL).toBe('https://login.cac1.pure.cloud');
         expect(request.url).toBe('/oauth/token');
      });

      it('should use correct grant type', async () => {
         FileManager.readFileAsync.mockResolvedValueOnce({});
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            access_token: 'test-token',
            token_type: 'bearer',
            expires_in: 3600,
         });

         await tokenSvc.getValidTokenAsync();

         const request = mockAxiosSvc.sendRequestAsync.mock.calls[0][0];
         expect(request.params.grant_type).toBe('client_credentials');
      });
   });
});
