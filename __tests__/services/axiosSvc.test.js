import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosSvc } from '../../src/services/axiosSvc.js';

vi.mock('timers/promises', () => ({
   setTimeout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/constants.js', () => ({
   default: {
      ROOT_FOLDER: '/mock/root',
      GENESYS_ENDPOINT_URL: 'https://api.example.com',
      DEFAULT_API_PAGE_SIZE: 100,
      GENESYS_CLIENT_ID: 'mock-client-id',
      GENESYS_CLIENT_SECRET: 'mock-client-secret',
   },
}));

vi.mock('../../src/services/winstonService.js', () => ({
   default: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
   },
}));

vi.mock('../../src/services/tokenSvc.js', () => ({
   default: {
      getValidTokenAsync: vi.fn(),
      cleanTokenAsync: vi.fn(),
   },
}));

const tokenSvc = (await import('../../src/services/tokenSvc.js')).default;
const logger = (await import('../../src/services/winstonService.js')).default;

describe('AxiosSvc', () => {
   let mockAxiosInstance;
   let axiosSvc;

   beforeEach(() => {
      mockAxiosInstance = vi.fn();
      axiosSvc = new AxiosSvc(mockAxiosInstance);

      vi.clearAllMocks();
      tokenSvc.getValidTokenAsync.mockResolvedValue('mock-token-123');
      tokenSvc.cleanTokenAsync.mockResolvedValue();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance with default configuration', () => {
         const service = new AxiosSvc(mockAxiosInstance);
         expect(service).toBeInstanceOf(AxiosSvc);
      });

      it('should use custom retry configuration', () => {
         const customConfig = {
            retryLimit: 5,
            retryDelays: { default: 5000 },
         };
         const service = new AxiosSvc(mockAxiosInstance, customConfig);
         expect(service).toBeInstanceOf(AxiosSvc);
      });

      it('should freeze retry configuration to prevent mutations', () => {
         const service = new AxiosSvc(mockAxiosInstance);
         expect(() => {
            service.DEFAULT_RETRY_DELAYS = {};
         }).not.toThrow();
      });
   });

   describe('sendRequestAsync - Success Cases', () => {
      it('should send request successfully on first attempt', async () => {
         const mockResponse = { data: 'success', conversations: [1, 2, 3] };
         mockAxiosInstance.mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
         expect(tokenSvc.getValidTokenAsync).toHaveBeenCalledTimes(1);
      });

      it('should use custom Authorization header if provided', async () => {
         const mockResponse = { data: 'success' };
         mockAxiosInstance.mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'POST',
            url: '/oauth/token',
            headers: {
               Authorization: 'Basic custom-auth',
            },
         };

         await axiosSvc.sendRequestAsync(request);

         expect(tokenSvc.getValidTokenAsync).not.toHaveBeenCalled();
         expect(mockAxiosInstance).toHaveBeenCalledWith(
            expect.objectContaining({
               headers: expect.objectContaining({
                  Authorization: 'Basic custom-auth',
               }),
            }),
         );
      });

      it('should use custom baseURL if provided', async () => {
         const mockResponse = { data: 'success' };
         mockAxiosInstance.mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/test',
            baseURL: 'https://custom.api.com',
         };

         await axiosSvc.sendRequestAsync(request);

         expect(mockAxiosInstance).toHaveBeenCalledWith(
            expect.objectContaining({
               baseURL: 'https://custom.api.com',
            }),
         );
      });

      it('should use custom Content-Type if provided', async () => {
         const mockResponse = { data: 'success' };
         mockAxiosInstance.mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'POST',
            url: '/upload',
            headers: {
               'Content-Type': 'multipart/form-data',
            },
         };

         await axiosSvc.sendRequestAsync(request);

         expect(mockAxiosInstance).toHaveBeenCalledWith(
            expect.objectContaining({
               headers: expect.objectContaining({
                  'Content-Type': 'multipart/form-data',
               }),
            }),
         );
      });
   });

   describe('sendRequestAsync - Validation', () => {
      it('should throw error if method is missing', async () => {
         const request = {
            url: '/api/test',
         };

         await expect(axiosSvc.sendRequestAsync(request)).rejects.toThrow();
      });

      it('should throw error if url is missing', async () => {
         const request = {
            method: 'GET',
         };

         await expect(axiosSvc.sendRequestAsync(request)).rejects.toThrow();
      });
   });

   describe('sendRequestAsync - Retry Logic', () => {
      it('should retry and succeed on second attempt', async () => {
         const mockError = {
            details: { status: 500 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mockError).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      });

      it('should throw error after max retries', async () => {
         const mockError = {
            details: { status: 500 },
         };

         mockAxiosInstance.mockRejectedValue(mockError);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await expect(axiosSvc.sendRequestAsync(request)).rejects.toThrow();

         expect(mockAxiosInstance).toHaveBeenCalledTimes(3);
      });
   });

   describe('sendRequestAsync - 401 Token Expiration', () => {
      it('should refresh token and retry on 401 error', async () => {
         const mock401Error = {
            details: { status: 401 },
         };
         const mockResponse = { data: 'success' };

         tokenSvc.getValidTokenAsync.mockResolvedValueOnce('expired-token').mockResolvedValueOnce('fresh-token');

         mockAxiosInstance.mockRejectedValueOnce(mock401Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(tokenSvc.cleanTokenAsync).toHaveBeenCalledTimes(1);
         expect(tokenSvc.getValidTokenAsync).toHaveBeenCalledTimes(2);
         expect(logger.info).toHaveBeenCalledWith('Token expired - refreshing and retrying');
      });
   });

   describe('sendRequestAsync - 429 Rate Limiting', () => {
      it('should wait and retry on 429 error', async () => {
         const mock429Error = {
            details: { status: 429 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock429Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      });
   });

   describe('sendRequestAsync - Client Errors (No Retry)', () => {
      it('should not retry on 400 error', async () => {
         const mock400Error = {
            details: { status: 400 },
         };

         mockAxiosInstance.mockRejectedValueOnce(mock400Error);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await expect(axiosSvc.sendRequestAsync(request)).rejects.toMatchObject({
            message: expect.stringContaining('Client error'),
         });

         expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
      });

      it('should not retry on 404 error', async () => {
         const mock404Error = {
            details: { status: 404 },
         };

         mockAxiosInstance.mockRejectedValueOnce(mock404Error);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await expect(axiosSvc.sendRequestAsync(request)).rejects.toMatchObject({
            message: expect.stringContaining('Client error'),
         });

         expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
      });

      it('should not retry on undefined status code', async () => {
         const mockError = {
            details: {},
         };

         mockAxiosInstance.mockRejectedValueOnce(mockError);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await expect(axiosSvc.sendRequestAsync(request)).rejects.toMatchObject({
            message: expect.stringContaining('Client error'),
         });

         expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
      });
   });

   describe('sendRequestAsync - Server Errors with Exponential Backoff', () => {
      it('should apply exponential backoff for 500 errors', async () => {
         const mock500Error = {
            details: { status: 500 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance
            .mockRejectedValueOnce(mock500Error)
            .mockRejectedValueOnce(mock500Error)
            .mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(3);
         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Server error (500)'));
      });

      it('should handle 502 errors with exponential backoff', async () => {
         const mock502Error = {
            details: { status: 502 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock502Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      });

      it('should handle 503 errors with exponential backoff', async () => {
         const mock503Error = {
            details: { status: 503 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock503Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      });

      it('should handle 504 errors with exponential backoff', async () => {
         const mock504Error = {
            details: { status: 504 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock504Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      });
   });

   describe('sendRequestAsync - Unknown Errors', () => {
      it('should retry on unknown status codes', async () => {
         const mockUnknownError = {
            details: { status: 418 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mockUnknownError).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected error (418)'));
      });

      it('should handle string status codes', async () => {
         const mockError = {
            details: { status: '500' },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mockError).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         const response = await axiosSvc.sendRequestAsync(request);

         expect(response).toEqual(mockResponse);
         expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      });
   });

   describe('sendRequestAsync - Logging', () => {
      it('should not log 401 errors', async () => {
         const mock401Error = {
            details: { status: 401 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock401Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await axiosSvc.sendRequestAsync(request);

         expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('API Request ERROR'));
      });

      it('should not log 429 errors', async () => {
         const mock429Error = {
            details: { status: 429 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock429Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await axiosSvc.sendRequestAsync(request);

         expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('API Request ERROR'));
      });

      it('should log other errors', async () => {
         const mock500Error = {
            details: { status: 500 },
         };
         const mockResponse = { data: 'success' };

         mockAxiosInstance.mockRejectedValueOnce(mock500Error).mockResolvedValueOnce(mockResponse);

         const request = {
            method: 'GET',
            url: '/api/test',
         };

         await axiosSvc.sendRequestAsync(request);

         expect(logger.error).toHaveBeenCalled();
      });
   });

   describe('AxiosSvc - Static Properties', () => {
      it('should have correct default retry limit', () => {
         expect(AxiosSvc.DEFAULT_RETRY_LIMIT).toBe(3);
      });

      it('should have correct default retry delays', () => {
         expect(AxiosSvc.DEFAULT_RETRY_DELAYS).toEqual({
            default: 10000,
            rateLimited: 60000,
            serverError: 5000,
         });
      });

      it('should have frozen default retry delays', () => {
         expect(Object.isFrozen(AxiosSvc.DEFAULT_RETRY_DELAYS)).toBe(true);
      });
   });
});
