import { describe, it, expect } from 'vitest';
import ApiRequestError from '../../../src/utils/errors/apiRequestError.js';

describe('ApiRequestError', () => {
   describe('constructor', () => {
      it('should create instance with default message when no error provided', () => {
         const apiError = new ApiRequestError();

         expect(apiError).toBeInstanceOf(Error);
         expect(apiError).toBeInstanceOf(ApiRequestError);
         expect(apiError.name).toBe('ApiRequestError');
         expect(apiError.message).toBe('Unknown Error Occurred');
      });

      it('should create instance with custom error message', () => {
         const error = { message: 'Connection timeout' };
         const apiError = new ApiRequestError(error);

         expect(apiError.message).toBe('Connection timeout');
         expect(apiError.name).toBe('ApiRequestError');
      });

      it('should create instance with empty object', () => {
         const apiError = new ApiRequestError({});

         expect(apiError.message).toBe('Unknown Error Occurred');
         expect(apiError.name).toBe('ApiRequestError');
      });

      it('should create instance with null error', () => {
         const apiError = new ApiRequestError(null);

         expect(apiError.message).toBe('Unknown Error Occurred');
         expect(apiError.name).toBe('ApiRequestError');
      });

      it('should create instance with undefined error', () => {
         const apiError = new ApiRequestError(undefined);

         expect(apiError.message).toBe('Unknown Error Occurred');
         expect(apiError.name).toBe('ApiRequestError');
      });
   });

   describe('toObject - HTTP errors with response', () => {
      it('should normalize HTTP error with full response data', () => {
         const error = {
            message: 'Request failed with status code 404',
            response: {
               status: 404,
               statusText: 'Not Found',
               data: { message: 'Resource not found' },
               config: {
                  method: 'GET',
                  url: 'https://api.example.com/users/123',
                  data: { id: 123 },
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            message: 'Resource not found',
            details: {
               status: 404,
               statusText: 'Not Found',
               url: 'https://api.example.com/users/123',
               method: 'GET',
               requestData: { id: 123 },
            },
         });
      });

      it('should handle HTTP error without response message', () => {
         const error = {
            response: {
               status: 500,
               statusText: 'Internal Server Error',
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            details: {
               status: 500,
               statusText: 'Internal Server Error',
               url: 'https://api.example.com/data',
               method: 'POST',
            },
         });
      });

      it('should handle HTTP error with missing config properties', () => {
         const error = {
            response: {
               status: 403,
               statusText: 'Forbidden',
               data: { message: 'Access denied' },
               config: {},
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            message: 'Access denied',
            details: {
               status: 403,
               statusText: 'Forbidden',
               url: 'Unknown',
               method: 'Unknown',
            },
         });
      });

      it('should handle HTTP error with null status', () => {
         const error = {
            response: {
               status: null,
               statusText: 'Unknown',
               data: {},
               config: {
                  method: 'DELETE',
                  url: 'https://api.example.com/item',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details).not.toHaveProperty('status');
      });

      it('should handle HTTP error with zero status code', () => {
         const error = {
            response: {
               status: 0,
               data: {},
               config: {
                  method: 'GET',
                  url: 'https://api.example.com/test',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.status).toBe(0);
      });

      it('should handle HTTP error without statusText', () => {
         const error = {
            response: {
               status: 400,
               data: {},
               config: {
                  method: 'PUT',
                  url: 'https://api.example.com/update',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details).not.toHaveProperty('statusText');
      });

      it('should not include requestData when null', () => {
         const error = {
            response: {
               status: 201,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/create',
                  data: null,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details).not.toHaveProperty('requestData');
      });

      it('should include requestData with number value', () => {
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/number',
                  data: 42,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toBe(42);
      });

      it('should include requestData with boolean value', () => {
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/boolean',
                  data: false,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toBe(false);
      });

      it('should not include requestData when undefined', () => {
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'GET',
                  url: 'https://api.example.com/get',
                  data: undefined,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details).not.toHaveProperty('requestData');
      });

      it('should truncate long string requestData over 1000 characters', () => {
         const longString = 'a'.repeat(1500);
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: longString,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toBe('a'.repeat(1000) + '...[truncated]');
         expect(result.details.requestData.length).toBe(1014);
      });

      it('should not truncate string requestData under 1000 characters', () => {
         const shortString = 'a'.repeat(999);
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: shortString,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toBe(shortString);
         expect(result.details.requestData.length).toBe(999);
      });

      it('should not truncate string requestData exactly 1000 characters', () => {
         const exactString = 'a'.repeat(1000);
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: exactString,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toBe(exactString);
         expect(result.details.requestData.length).toBe(1000);
      });

      it('should truncate array requestData with more than 10 items', () => {
         const largeArray = Array.from({ length: 15 }, (_, i) => i);
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: largeArray,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '...[5 more items truncated]']);
         expect(result.details.requestData.length).toBe(11);
      });

      it('should not truncate array requestData with exactly 10 items', () => {
         const array = Array.from({ length: 10 }, (_, i) => i);
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: array,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toEqual(array);
         expect(result.details.requestData.length).toBe(10);
      });

      it('should not truncate array requestData with less than 10 items', () => {
         const smallArray = [1, 2, 3];
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: smallArray,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toEqual(smallArray);
      });

      it('should not truncate object requestData', () => {
         const objectData = { key1: 'value1', key2: 'value2', key3: { nested: 'data' } };
         const error = {
            response: {
               status: 200,
               data: {},
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/data',
                  data: objectData,
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.requestData).toEqual(objectData);
      });
   });

   describe('toObject - Network errors without response', () => {
      it('should normalize network error with request details', () => {
         const error = {
            message: 'Network Error',
            code: 'ECONNREFUSED',
            request: {
               _options: {
                  path: '/api/users',
                  method: 'GET',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            details: {
               status: 'ECONNREFUSED',
               statusText: 'Network Error',
               url: '/api/users',
               method: 'GET',
            },
         });
      });

      it('should handle network error without request details', () => {
         const error = {
            message: 'Network Error',
            code: 'ETIMEDOUT',
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            details: {
               status: 'ETIMEDOUT',
               statusText: 'Network Error',
               url: 'Unknown',
               method: 'Unknown',
            },
         });
      });

      it('should handle network error without code', () => {
         const error = {
            message: 'Connection failed',
            request: {
               _options: {
                  path: '/api/data',
                  method: 'POST',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            details: {
               status: 'Unknown',
               statusText: 'Connection failed',
               url: '/api/data',
               method: 'POST',
            },
         });
      });

      it('should handle network error without message', () => {
         const error = {
            code: 'ENOTFOUND',
            request: {
               _options: {
                  path: '/api/endpoint',
                  method: 'DELETE',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            details: {
               status: 'ENOTFOUND',
               statusText: 'Unknown Error Occurred',
               url: '/api/endpoint',
               method: 'DELETE',
            },
         });
      });

      it('should handle network error with partial request options', () => {
         const error = {
            message: 'Request aborted',
            code: 'ECONNABORTED',
            request: {
               _options: {
                  path: '/api/test',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.url).toBe('/api/test');
         expect(result.details.method).toBe('Unknown');
      });

      it('should handle network error with empty request options', () => {
         const error = {
            message: 'DNS lookup failed',
            code: 'EAI_AGAIN',
            request: {
               _options: {},
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.url).toBe('Unknown');
         expect(result.details.method).toBe('Unknown');
      });

      it('should handle network error with null request', () => {
         const error = {
            message: 'Request failed',
            code: 'ERR_NETWORK',
            request: null,
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.url).toBe('Unknown');
         expect(result.details.method).toBe('Unknown');
      });
   });

   describe('toObject - Edge cases', () => {
      it('should handle error with invalid response type', () => {
         const error = {
            message: 'Invalid response',
            response: 'not an object',
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.details.status).toBe('Unknown');
         expect(result.details.statusText).toBe('Invalid response');
      });

      it('should handle error with null response', () => {
         const error = {
            message: 'Null response',
            response: null,
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.className).toBe('ApiRequestError');
         expect(result.details.statusText).toBe('Null response');
      });

      it('should handle completely empty error object', () => {
         const apiError = new ApiRequestError({});
         const result = apiError.toObject();

         expect(result).toEqual({
            className: 'ApiRequestError',
            details: {
               status: 'Unknown',
               statusText: 'Unknown Error Occurred',
               url: 'Unknown',
               method: 'Unknown',
            },
         });
      });

      it('should handle error with response.data as null', () => {
         const error = {
            response: {
               status: 204,
               data: null,
               config: {
                  method: 'DELETE',
                  url: 'https://api.example.com/item/1',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.message).toBeUndefined();
         expect(result.details.status).toBe(204);
      });

      it('should handle error with response.data.message as empty string', () => {
         const error = {
            response: {
               status: 400,
               data: { message: '' },
               config: {
                  method: 'POST',
                  url: 'https://api.example.com/validate',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.message).toBeUndefined();
      });

      it('should handle error with response.data.message as non-string', () => {
         const error = {
            response: {
               status: 500,
               data: { message: 12345 },
               config: {
                  method: 'GET',
                  url: 'https://api.example.com/data',
               },
            },
         };

         const apiError = new ApiRequestError(error);
         const result = apiError.toObject();

         expect(result.message).toBe(12345);
      });
   });
});
