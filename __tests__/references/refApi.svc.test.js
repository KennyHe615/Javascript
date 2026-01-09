import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefApiSvc } from '../../src/references/refApi.svc.js';

describe('RefApiSvc', () => {
   let mockAxiosSvc;
   let refApiSvc;

   beforeEach(() => {
      mockAxiosSvc = {
         sendRequestAsync: vi.fn(),
      };
      refApiSvc = new RefApiSvc({ axiosSvc: mockAxiosSvc });
   });

   describe('constructor', () => {
      it('should create instance with injected dependencies', () => {
         expect(refApiSvc).toBeInstanceOf(RefApiSvc);
      });

      it('should use default axiosSvc if no dependency provided', () => {
         const serviceWithDefaults = new RefApiSvc();
         expect(serviceWithDefaults).toBeInstanceOf(RefApiSvc);
      });
   });

   describe('getReferenceDataAsync - Input Validation', () => {
      it('should throw error when apiUrl is missing', async () => {
         await expect(refApiSvc.getReferenceDataAsync('', 'users')).rejects.toMatchObject({
            message: 'Invalid apiUrl: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });

      it('should throw error when apiUrl is null', async () => {
         await expect(refApiSvc.getReferenceDataAsync(null, 'users')).rejects.toMatchObject({
            message: 'Invalid apiUrl: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });

      it('should throw error when apiUrl is not a string', async () => {
         await expect(refApiSvc.getReferenceDataAsync(123, 'users')).rejects.toMatchObject({
            message: 'Invalid apiUrl: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });

      it('should throw error when apiUrl is whitespace only', async () => {
         await expect(refApiSvc.getReferenceDataAsync('   ', 'users')).rejects.toMatchObject({
            message: 'Invalid apiUrl: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });

      it('should throw error when entityName is missing', async () => {
         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', '')).rejects.toMatchObject({
            message: 'Invalid entityName: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });

      it('should throw error when entityName is null', async () => {
         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', null)).rejects.toMatchObject({
            message: 'Invalid entityName: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });

      it('should throw error when entityName is not a string', async () => {
         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 123)).rejects.toMatchObject({
            message: 'Invalid entityName: must be a non-empty string',
            className: 'RefApiSvc',
            functionName: '#validateInputs',
         });
      });
   });

   describe('getReferenceDataAsync - Single Page Response', () => {
      it('should return entities from single page response', async () => {
         const mockEntities = [
            { id: '1', name: 'Entity 1' },
            { id: '2', name: 'Entity 2' },
         ];

         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: mockEntities,
            nextUri: null,
         });

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/users', 'users');

         expect(result).toEqual(mockEntities);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(1);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledWith({
            method: 'GET',
            url: '/api/v2/users',
         });
      });

      it('should handle empty nextUri field', async () => {
         const mockEntities = [{ id: '1', name: 'Entity 1' }];

         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: mockEntities,
            nextUri: '',
         });

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/queues', 'queues');

         expect(result).toEqual(mockEntities);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(1);
      });
   });

   describe('getReferenceDataAsync - Multiple Page Response', () => {
      it('should aggregate entities from multiple pages', async () => {
         const page1Entities = [
            { id: '1', name: 'Entity 1' },
            { id: '2', name: 'Entity 2' },
         ];
         const page2Entities = [
            { id: '3', name: 'Entity 3' },
            { id: '4', name: 'Entity 4' },
         ];
         const page3Entities = [{ id: '5', name: 'Entity 5' }];

         mockAxiosSvc.sendRequestAsync
            .mockResolvedValueOnce({
               entities: page1Entities,
               nextUri: '/api/v2/users?pageNumber=2',
            })
            .mockResolvedValueOnce({
               entities: page2Entities,
               nextUri: '/api/v2/users?pageNumber=3',
            })
            .mockResolvedValueOnce({
               entities: page3Entities,
               nextUri: null,
            });

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/users', 'users');

         expect(result).toEqual([...page1Entities, ...page2Entities, ...page3Entities]);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(3);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenNthCalledWith(1, {
            method: 'GET',
            url: '/api/v2/users',
         });
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenNthCalledWith(2, {
            method: 'GET',
            url: '/api/v2/users?pageNumber=2',
         });
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenNthCalledWith(3, {
            method: 'GET',
            url: '/api/v2/users?pageNumber=3',
         });
      });

      it('should handle empty entities array in subsequent pages', async () => {
         const page1Entities = [{ id: '1', name: 'Entity 1' }];
         const page2Entities = [];

         mockAxiosSvc.sendRequestAsync
            .mockResolvedValueOnce({
               entities: page1Entities,
               nextUri: '/api/v2/users?pageNumber=2',
            })
            .mockResolvedValueOnce({
               entities: page2Entities,
               nextUri: null,
            });

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/users', 'users');

         expect(result).toEqual(page1Entities);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(2);
      });
   });

   describe('getReferenceDataAsync - Error Handling', () => {
      it('should throw error when entities field is missing', async () => {
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            nextUri: null,
         });

         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 'users')).rejects.toMatchObject({
            message: 'Invalid response: Missing or invalid "entities" array in response',
            className: 'RefApiSvc',
            functionName: 'getReferenceDataAsync',
            parameters: expect.objectContaining({
               apiUrl: '/api/v2/users',
               currentUrl: '/api/v2/users',
               iterationCount: 0,
               hasEntities: false,
            }),
         });
      });

      it('should throw error when entities is not an array', async () => {
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: 'not an array',
            nextUri: null,
         });

         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 'users')).rejects.toMatchObject({
            message: 'Invalid response: Missing or invalid "entities" array in response',
            className: 'RefApiSvc',
            functionName: 'getReferenceDataAsync',
            parameters: expect.objectContaining({
               hasEntities: true,
               entitiesType: 'string',
            }),
         });
      });

      it('should throw error when entities array is empty in first response', async () => {
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: [],
            nextUri: null,
         });

         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 'users')).rejects.toMatchObject({
            message: 'Invalid response: "entities" array is empty in first response',
            className: 'RefApiSvc',
            functionName: 'getReferenceDataAsync',
            parameters: expect.objectContaining({
               apiUrl: '/api/v2/users',
               currentUrl: '/api/v2/users',
            }),
         });
      });

      it('should throw error when exceeding max pagination iterations', async () => {
         mockAxiosSvc.sendRequestAsync.mockResolvedValue({
            entities: [{ id: '1' }],
            nextUri: '/api/v2/users?pageNumber=next',
         });

         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 'users')).rejects.toMatchObject({
            message: 'Exceeded maximum pagination iterations (100)',
            className: 'RefApiSvc',
            functionName: 'getReferenceDataAsync',
            parameters: expect.objectContaining({
               apiUrl: '/api/v2/users',
               iterationCount: 100,
            }),
         });

         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(100);
      });

      it('should throw error when response is null', async () => {
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(null);

         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 'users')).rejects.toMatchObject({
            message: 'Invalid response: Missing or invalid "entities" array in response',
            className: 'RefApiSvc',
            functionName: 'getReferenceDataAsync',
         });
      });

      it('should throw error when response is undefined', async () => {
         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce(undefined);

         await expect(refApiSvc.getReferenceDataAsync('/api/v2/users', 'users')).rejects.toMatchObject({
            message: 'Invalid response: Missing or invalid "entities" array in response',
            className: 'RefApiSvc',
            functionName: 'getReferenceDataAsync',
         });
      });
   });

   describe('getReferenceDataAsync - Edge Cases', () => {
      it('should handle response with extra fields', async () => {
         const mockEntities = [{ id: '1', name: 'Entity 1' }];

         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: mockEntities,
            nextUri: null,
            pageSize: 500,
            pageNumber: 1,
            total: 1,
            extraField: 'ignored',
         });

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/users', 'users');

         expect(result).toEqual(mockEntities);
      });

      it('should handle large number of pages without hitting limit', async () => {
         const mockEntity = { id: '1', name: 'Entity' };

         for (let i = 0; i < 50; i++) {
            mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
               entities: [mockEntity],
               nextUri: i < 49 ? `/api/v2/users?pageNumber=${i + 2}` : null,
            });
         }

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/users', 'users');

         expect(result).toHaveLength(50);
         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledTimes(50);
      });

      it('should preserve entity objects exactly as received', async () => {
         const complexEntity = {
            id: '1',
            name: 'Complex Entity',
            nested: { field: 'value' },
            array: [1, 2, 3],
            date: '2025-01-09T00:00:00Z',
         };

         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: [complexEntity],
            nextUri: null,
         });

         const result = await refApiSvc.getReferenceDataAsync('/api/v2/users', 'users');

         expect(result[0]).toEqual(complexEntity);
         expect(result[0]).toBe(complexEntity);
      });

      it('should handle URL with query parameters', async () => {
         const mockEntities = [{ id: '1' }];

         mockAxiosSvc.sendRequestAsync.mockResolvedValueOnce({
            entities: mockEntities,
            nextUri: null,
         });

         await refApiSvc.getReferenceDataAsync('/api/v2/users?pageSize=500&sortOrder=asc', 'users');

         expect(mockAxiosSvc.sendRequestAsync).toHaveBeenCalledWith({
            method: 'GET',
            url: '/api/v2/users?pageSize=500&sortOrder=asc',
         });
      });
   });
});
