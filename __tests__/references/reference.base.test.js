import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReferenceBase from '../../src/references/reference.base.js';
import SequelizeSvc from '../../src/services/sequelizeSvc.js';
import logger from '../../src/services/winstonSvc.js';

vi.mock('../../src/services/sequelizeSvc.js', () => ({
   default: {
      syncModelAsync: vi.fn(),
      upsertAsync: vi.fn(),
   },
}));

vi.mock('../../src/services/winstonSvc.js', () => ({
   default: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
   },
}));

describe('ReferenceBase', () => {
   let mockRefApiSvc;
   let mockMapper;
   let mockModel;
   let referenceBase;

   beforeEach(() => {
      mockRefApiSvc = {
         getReferenceDataAsync: vi.fn(),
      };

      mockMapper = {
         map: vi.fn(),
      };

      mockModel = {
         NAME: 'TestModel',
         sync: vi.fn(),
      };

      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance with all required parameters', () => {
         referenceBase = new ReferenceBase('/api/test', mockMapper, mockModel);

         expect(referenceBase).toBeInstanceOf(ReferenceBase);
         expect(referenceBase.initialUrl).toBe('/api/test');
         expect(referenceBase.mapper).toBe(mockMapper);
         expect(referenceBase.model).toBe(mockModel);
      });

      it('should use default refApiSvc when not provided', () => {
         referenceBase = new ReferenceBase('/api/test', mockMapper, mockModel);

         expect(referenceBase).toBeInstanceOf(ReferenceBase);
      });

      it('should use custom refApiSvc when provided', () => {
         referenceBase = new ReferenceBase('/api/test', mockMapper, mockModel, {
            refApiSvc: mockRefApiSvc,
         });

         expect(referenceBase).toBeInstanceOf(ReferenceBase);
      });

      it('should handle empty dependencies object', () => {
         referenceBase = new ReferenceBase('/api/test', mockMapper, mockModel, {});

         expect(referenceBase).toBeInstanceOf(ReferenceBase);
      });
   });

   describe('runAsync()', () => {
      beforeEach(() => {
         referenceBase = new ReferenceBase('/api/test', mockMapper, mockModel, {
            refApiSvc: mockRefApiSvc,
         });
      });

      describe('Success Cases', () => {
         it('should execute full workflow successfully', async () => {
            const apiData = [{ id: 1, name: 'Test' }];
            const mappedData = [{ testId: 1, testName: 'Test' }];

            // SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue(apiData);
            mockMapper.map.mockReturnValue(mappedData);
            SequelizeSvc.upsertAsync.mockResolvedValue(undefined);

            const result = await referenceBase.runAsync();

            expect(result).toBe(true);
            // expect(SequelizeSvc.syncModelAsync).toHaveBeenCalledWith(mockModel, { alter: true });
            expect(mockRefApiSvc.getReferenceDataAsync).toHaveBeenCalledWith('/api/test', 'TestModel');
            expect(mockMapper.map).toHaveBeenCalledWith(apiData);
            expect(SequelizeSvc.upsertAsync).toHaveBeenCalledWith(mappedData, mockModel);
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Reference data sync completed successfully'));
         });

         it('should handle empty data array gracefully', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);

            const result = await referenceBase.runAsync();

            expect(result).toBe(true);
            expect(mockMapper.map).not.toHaveBeenCalled();
            expect(SequelizeSvc.upsertAsync).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No data received from API'));
         });

         it('should handle null data gracefully', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue(null);

            const result = await referenceBase.runAsync();

            expect(result).toBe(true);
            expect(mockMapper.map).not.toHaveBeenCalled();
            expect(SequelizeSvc.upsertAsync).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalled();
         });

         it('should handle undefined data gracefully', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue(undefined);

            const result = await referenceBase.runAsync();

            expect(result).toBe(true);
            expect(mockMapper.map).not.toHaveBeenCalled();
            expect(SequelizeSvc.upsertAsync).not.toHaveBeenCalled();
         });

         it('should process large datasets', async () => {
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item${i}` }));
            const mappedLargeDataset = largeDataset.map((item) => ({ testId: item.id, testName: item.name }));

            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue(largeDataset);
            mockMapper.map.mockReturnValue(mappedLargeDataset);
            SequelizeSvc.upsertAsync.mockResolvedValue(undefined);

            const result = await referenceBase.runAsync();

            expect(result).toBe(true);
            expect(SequelizeSvc.upsertAsync).toHaveBeenCalledWith(mappedLargeDataset, mockModel);
         });
      });

      describe('Error Handling', () => {
         // it('should throw CustomError when syncModelAsync fails', async () => {
         //    const syncError = new Error('Sync failed');
         // SequelizeSvc.syncModelAsync.mockRejectedValue(syncError);

         // await expect(referenceBase.runAsync()).rejects.toMatchObject({
         //    message: 'Error in TestModel reference',
         //    className: 'ReferenceBase',
         // });
         // });

         it('should throw CustomError when getReferenceDataAsync fails', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockRejectedValue(new Error('API error'));

            await expect(referenceBase.runAsync()).rejects.toMatchObject({
               message: 'Error in TestModel reference',
               className: 'ReferenceBase',
            });
         });

         it('should throw CustomError when mapper fails', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([{ id: 1 }]);
            mockMapper.map.mockImplementation(() => {
               throw new Error('Mapping error');
            });

            await expect(referenceBase.runAsync()).rejects.toMatchObject({
               message: 'Error in TestModel reference',
               className: 'ReferenceBase',
            });
         });

         it('should throw CustomError when upsertAsync fails', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([{ id: 1 }]);
            mockMapper.map.mockReturnValue([{ testId: 1 }]);
            SequelizeSvc.upsertAsync.mockRejectedValue(new Error('Upsert failed'));

            await expect(referenceBase.runAsync()).rejects.toMatchObject({
               message: 'Error in TestModel reference',
               className: 'ReferenceBase',
            });
         });

         it('should include error details in thrown error', async () => {
            const originalError = new Error('Original error');
            SequelizeSvc.syncModelAsync.mockRejectedValue(originalError);

            try {
               await referenceBase.runAsync();
            } catch (err) {
               expect(err.className).toBe('ReferenceBase');
               expect(err.parameters).toEqual({
                  initialUrl: '/api/test',
               });
               expect(err.details).toBeDefined();
            }
         });

         it('should include initialUrl in error parameters', async () => {
            SequelizeSvc.syncModelAsync.mockRejectedValue(new Error('Test error'));

            try {
               await referenceBase.runAsync();
            } catch (err) {
               expect(err.parameters.initialUrl).toBe('/api/test');
            }
         });
      });

      describe('Workflow Order', () => {
         it('should execute steps in correct order', async () => {
            const callOrder = [];

            // SequelizeSvc.syncModelAsync.mockImplementation(async () => {
            //    callOrder.push('sync');
            // });
            mockRefApiSvc.getReferenceDataAsync.mockImplementation(async () => {
               callOrder.push('fetch');
               return [{ id: 1 }];
            });
            mockMapper.map.mockImplementation(() => {
               callOrder.push('map');
               return [{ testId: 1 }];
            });
            SequelizeSvc.upsertAsync.mockImplementation(async () => {
               callOrder.push('upsert');
            });

            await referenceBase.runAsync();

            expect(callOrder).toEqual(['fetch', 'map', 'upsert']);
         });

         it('should not call mapper or upsert when no data received', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);

            await referenceBase.runAsync();

            expect(mockMapper.map).not.toHaveBeenCalled();
            expect(SequelizeSvc.upsertAsync).not.toHaveBeenCalled();
         });

         it('should not call upsert if API fetch fails', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockRejectedValue(new Error('API error'));

            await expect(referenceBase.runAsync()).rejects.toThrow();
            expect(SequelizeSvc.upsertAsync).not.toHaveBeenCalled();
         });
      });

      describe('Model NAME Usage', () => {
         it('should use model.NAME for API calls', async () => {
            mockModel.NAME = 'CustomModelName';
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);

            await referenceBase.runAsync();

            expect(mockRefApiSvc.getReferenceDataAsync).toHaveBeenCalledWith('/api/test', 'CustomModelName');
         });

         it('should use model.NAME in log messages', async () => {
            mockModel.NAME = 'LogTestModel';
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);

            await referenceBase.runAsync();

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[LogTestModel]'));
         });

         it('should use model.NAME in error messages', async () => {
            mockModel.NAME = 'ErrorTestModel';
            SequelizeSvc.syncModelAsync.mockRejectedValue(new Error('Test'));

            try {
               await referenceBase.runAsync();
            } catch (err) {
               expect(err.message).toContain('ErrorTestModel');
            }
         });
      });

      describe('Edge Cases', () => {
         it('should handle mapper returning empty array', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([{ id: 1 }]);
            mockMapper.map.mockReturnValue([]);
            SequelizeSvc.upsertAsync.mockResolvedValue(undefined);

            const result = await referenceBase.runAsync();

            expect(result).toBe(true);
            expect(SequelizeSvc.upsertAsync).toHaveBeenCalledWith([], mockModel);
         });

         it('should handle model without NAME property', async () => {
            mockModel.NAME = undefined;
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);

            await referenceBase.runAsync();

            expect(mockRefApiSvc.getReferenceDataAsync).toHaveBeenCalledWith('/api/test', undefined);
         });

         // it('should pass alter: true to syncModelAsync', async () => {
         //    SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
         //    mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);
         //
         //    await referenceBase.runAsync();
         //
         //    expect(SequelizeSvc.syncModelAsync).toHaveBeenCalledWith(mockModel, { alter: true });
         // });
      });

      describe('Logging', () => {
         it('should log warning when no data received', async () => {
            SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([]);

            await referenceBase.runAsync();

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[TestModel]'));
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No data received from API'));
         });

         it('should log debug on successful completion', async () => {
            // SequelizeSvc.syncModelAsync.mockResolvedValue(undefined);
            mockRefApiSvc.getReferenceDataAsync.mockResolvedValue([{ id: 1 }]);
            mockMapper.map.mockReturnValue([{ testId: 1 }]);
            SequelizeSvc.upsertAsync.mockResolvedValue(undefined);

            await referenceBase.runAsync();

            // expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('[TestModel]'));
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Reference data sync completed successfully'));
         });
      });
   });
});
