import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SequelizeSvc from '../../src/services/sequelizeSvc.js';
import logger from '../../src/services/winstonSvc.js';

vi.mock('../../src/services/winstonSvc.js', () => ({
   default: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
   },
}));

vi.mock('../../src/utils/constants.js', () => ({
   default: {
      RUNNING_ENVIRONMENT: 'development',
   },
}));

describe('SequelizeSvc', () => {
   let mockSequelizeInstance;
   let sequelizeSvc;

   beforeEach(() => {
      mockSequelizeInstance = {
         authenticate: vi.fn(),
         query: vi.fn(),
         close: vi.fn(),
         config: {
            database: 'test_db',
         },
      };

      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance with valid Sequelize instance', () => {
         sequelizeSvc = new SequelizeSvc(mockSequelizeInstance);

         expect(sequelizeSvc).toBeInstanceOf(SequelizeSvc);
      });

      it('should throw error when instance is not provided', () => {
         expect(() => new SequelizeSvc()).toThrow();
      });

      it('should throw error when instance is null', () => {
         expect(() => new SequelizeSvc(null)).toThrow();
      });

      it('should throw error when instance is undefined', () => {
         expect(() => new SequelizeSvc(undefined)).toThrow();
      });
   });

   describe('connectAsync()', () => {
      beforeEach(() => {
         sequelizeSvc = new SequelizeSvc(mockSequelizeInstance);
      });

      it('should connect successfully', async () => {
         mockSequelizeInstance.authenticate.mockResolvedValue(undefined);
         mockSequelizeInstance.query.mockResolvedValue([[{ connection_test: 1 }]]);

         await sequelizeSvc.connectAsync();

         expect(mockSequelizeInstance.authenticate).toHaveBeenCalledTimes(1);
         expect(mockSequelizeInstance.query).toHaveBeenCalledWith('SELECT 1 AS connection_test');
         expect(logger.info).toHaveBeenCalledWith('Database test_db Connected SUCCESSFULLY!');
      });

      it('should throw DatabaseError when authentication fails', async () => {
         const authError = new Error('Authentication failed');
         mockSequelizeInstance.authenticate.mockRejectedValue(authError);

         await expect(sequelizeSvc.connectAsync()).rejects.toThrow();
         expect(logger.error).toHaveBeenCalled();
      });

      it('should throw DatabaseError when query test fails', async () => {
         mockSequelizeInstance.authenticate.mockResolvedValue(undefined);
         mockSequelizeInstance.query.mockRejectedValue(new Error('Query failed'));

         await expect(sequelizeSvc.connectAsync()).rejects.toThrow();
         expect(logger.error).toHaveBeenCalled();
      });

      it('should handle missing database name gracefully', async () => {
         const instanceWithoutDb = {
            authenticate: vi.fn().mockResolvedValue(undefined),
            query: vi.fn().mockResolvedValue([[{ connection_test: 1 }]]),
            config: {},
         };

         sequelizeSvc = new SequelizeSvc(instanceWithoutDb);

         await sequelizeSvc.connectAsync();

         expect(logger.info).toHaveBeenCalledWith('Database undefined Connected SUCCESSFULLY!');
      });

      it('should log error with database details on failure', async () => {
         const error = new Error('Connection timeout');
         mockSequelizeInstance.authenticate.mockRejectedValue(error);

         await expect(sequelizeSvc.connectAsync()).rejects.toThrow();

         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Database connection error'));
      });
   });

   describe('disconnectAsync()', () => {
      beforeEach(() => {
         sequelizeSvc = new SequelizeSvc(mockSequelizeInstance);
      });

      it('should disconnect successfully', async () => {
         mockSequelizeInstance.close.mockResolvedValue(undefined);

         await sequelizeSvc.disconnectAsync();

         expect(mockSequelizeInstance.close).toHaveBeenCalledTimes(1);
         expect(logger.info).toHaveBeenCalledWith('Database test_db Disconnected SUCCESSFULLY!');
      });

      it('should throw DatabaseError when close fails', async () => {
         const closeError = new Error('Close failed');
         mockSequelizeInstance.close.mockRejectedValue(closeError);

         await expect(sequelizeSvc.disconnectAsync()).rejects.toThrow();
         expect(logger.error).toHaveBeenCalled();
      });

      it('should handle missing database name gracefully on disconnect', async () => {
         const instanceWithoutDb = {
            close: vi.fn().mockResolvedValue(undefined),
            config: {},
         };

         sequelizeSvc = new SequelizeSvc(instanceWithoutDb);

         await sequelizeSvc.disconnectAsync();

         expect(logger.info).toHaveBeenCalledWith('Database undefined Disconnected SUCCESSFULLY!');
      });

      it('should log error with database details on disconnect failure', async () => {
         const error = new Error('Connection still active');
         mockSequelizeInstance.close.mockRejectedValue(error);

         await expect(sequelizeSvc.disconnectAsync()).rejects.toThrow();

         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Database disconnection error'));
      });
   });

   describe('upsertAsync() - Static Method', () => {
      let mockModel;

      beforeEach(() => {
         mockModel = {
            upsert: vi.fn(),
            NAME: 'TestModel',
            FIELDS: ['id', 'name', 'email'],
         };
         vi.useFakeTimers(); // For testing setTimeout
      });

      afterEach(() => {
         vi.useRealTimers();
      });

      describe('Success Cases', () => {
         it('should upsert single object successfully', async () => {
            mockModel.upsert.mockResolvedValue([{}, true]);

            const data = { id: 1, name: 'John' };
            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(mockModel.upsert).toHaveBeenCalledTimes(1);
            expect(mockModel.upsert).toHaveBeenCalledWith(data, { fields: mockModel.FIELDS });
         });

         it('should upsert array of objects successfully', async () => {
            mockModel.upsert.mockResolvedValue([{}, true]);

            const data = [
               { id: 1, name: 'John' },
               { id: 2, name: 'Jane' },
            ];

            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(mockModel.upsert).toHaveBeenCalledTimes(2);
         });

         it('should handle empty array without errors', async () => {
            await SequelizeSvc.upsertAsync([], mockModel);

            expect(mockModel.upsert).not.toHaveBeenCalled();
         });

         it('should use empty fields array when FIELDS not defined', async () => {
            mockModel.upsert.mockResolvedValue([{}, true]);
            delete mockModel.FIELDS;

            const data = { id: 1, name: 'John' };
            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(mockModel.upsert).toHaveBeenCalledWith(data, { fields: [] });
         });

         it('should handle model without NAME property', async () => {
            mockModel.upsert.mockResolvedValue([{}, true]);
            delete mockModel.NAME;

            const data = { id: 1, name: 'John' };
            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(mockModel.upsert).toHaveBeenCalledTimes(1);
         });

         it('should process data in batches', async () => {
            // Mock a larger dataset that would trigger batching
            mockModel.upsert.mockResolvedValue([{}, true]);

            const largeData = Array.from({ length: 150 }, (_, i) => ({
               id: i + 1,
               name: `User${i + 1}`,
            }));

            await SequelizeSvc.upsertAsync(largeData, mockModel);

            // Should process in batches (default batch size is 100)
            expect(mockModel.upsert).toHaveBeenCalledTimes(150);
         });

         it('should retry on deadlock errors', async () => {
            const deadlockError = new Error('Transaction was deadlocked');
            deadlockError.original = { message: 'deadlock' };

            mockModel.upsert.mockRejectedValueOnce(deadlockError).mockResolvedValueOnce([{}, true]);

            const data = { id: 1, name: 'John' };
            const upsertPromise = SequelizeSvc.upsertAsync(data, mockModel);

            // Fast-forward through the retry delay
            await vi.runAllTimersAsync();
            await upsertPromise;

            expect(mockModel.upsert).toHaveBeenCalledTimes(2);
         });
      });

      describe('Validation Errors', () => {
         it('should throw error when mappedData is null', async () => {
            await expect(SequelizeSvc.upsertAsync(null, mockModel)).rejects.toThrow();
         });

         it('should throw error when mappedData is undefined', async () => {
            await expect(SequelizeSvc.upsertAsync(undefined, mockModel)).rejects.toThrow();
         });

         it('should throw error when model is null', async () => {
            await expect(SequelizeSvc.upsertAsync({ id: 1 }, null)).rejects.toThrow();
         });

         it('should throw error when model is undefined', async () => {
            await expect(SequelizeSvc.upsertAsync({ id: 1 }, undefined)).rejects.toThrow();
         });

         it('should throw error when both parameters are missing', async () => {
            await expect(SequelizeSvc.upsertAsync()).rejects.toThrow();
         });
      });

      describe('Database Errors', () => {
         it('should throw CustomError when upsert fails after max retries', async () => {
            const deadlockError = new Error('Persistent deadlock');
            deadlockError.original = { message: 'deadlock' };
            mockModel.upsert.mockRejectedValue(deadlockError);

            const data = { id: 1, name: 'John' };

            const upsertPromise = SequelizeSvc.upsertAsync(data, mockModel);
            await vi.runAllTimersAsync();

            await expect(upsertPromise).rejects.toThrow('Upserting Record ERROR!');
            expect(mockModel.upsert).toHaveBeenCalledTimes(3); // Based on maxRetries: 3
         });

         it('should handle partial failure in array upsert', async () => {
            mockModel.upsert.mockResolvedValueOnce([{}, true]).mockRejectedValueOnce(new Error('Constraint error'));

            const data = [
               { id: 1, name: 'John' },
               { id: 2, name: 'Jane' },
            ];

            await expect(SequelizeSvc.upsertAsync(data, mockModel)).rejects.toThrow();
         });

         it('should log error details on failure', async () => {
            mockModel.upsert.mockRejectedValue(new Error('Database error'));

            await expect(SequelizeSvc.upsertAsync({ id: 1 }, mockModel)).rejects.toThrow();

            expect(logger.debug).not.toHaveBeenCalledWith(expect.stringContaining('Successfully upserted'));
         });
      });

      describe('Sequential Processing', () => {
         it('should process rows in a batch sequentially', async () => {
            let executionOrder = [];
            mockModel.upsert.mockImplementation(async (row) => {
               executionOrder.push(row.id);
               return [{}, true];
            });

            const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(executionOrder).toEqual([1, 2, 3]);
         });
      });
   });

   describe('createAsync() - Static Method', () => {
      let mockModel;

      beforeEach(() => {
         mockModel = {
            create: vi.fn(),
            NAME: 'TestModel',
         };
      });

      describe('Success Cases', () => {
         it('should create record successfully', async () => {
            const createdRecord = { id: 1, name: 'John', email: 'john@example.com' };
            mockModel.create.mockResolvedValue(createdRecord);

            const data = { name: 'John', email: 'john@example.com' };
            const result = await SequelizeSvc.createAsync(data, mockModel);

            expect(mockModel.create).toHaveBeenCalledTimes(1);
            expect(mockModel.create).toHaveBeenCalledWith(data);
            expect(result).toEqual(createdRecord);
         });

         it('should return created record with generated id', async () => {
            const createdRecord = { id: 42, name: 'Jane' };
            mockModel.create.mockResolvedValue(createdRecord);

            const result = await SequelizeSvc.createAsync({ name: 'Jane' }, mockModel);

            expect(result.id).toBe(42);
         });

         it('should handle model without NAME property', async () => {
            mockModel.create.mockResolvedValue({ id: 1, name: 'John' });
            delete mockModel.NAME;

            const result = await SequelizeSvc.createAsync({ name: 'John' }, mockModel);

            expect(result).toBeDefined();
         });
      });

      describe('Validation Errors', () => {
         it('should throw error when mappedData is null', async () => {
            await expect(SequelizeSvc.createAsync(null, mockModel)).rejects.toThrow();
         });

         it('should throw error when mappedData is undefined', async () => {
            await expect(SequelizeSvc.createAsync(undefined, mockModel)).rejects.toThrow();
         });

         it('should throw error when model is null', async () => {
            await expect(SequelizeSvc.createAsync({ name: 'John' }, null)).rejects.toThrow();
         });

         it('should throw error when model is undefined', async () => {
            await expect(SequelizeSvc.createAsync({ name: 'John' }, undefined)).rejects.toThrow();
         });

         it('should throw error when mappedData is empty object', async () => {
            await expect(SequelizeSvc.createAsync({}, mockModel)).rejects.toThrow('No data provided for create operation');
         });

         it('should throw error when both parameters are missing', async () => {
            await expect(SequelizeSvc.createAsync()).rejects.toThrow();
         });
      });

      describe('Database Errors', () => {
         it('should throw DatabaseError when create fails', async () => {
            const dbError = new Error('Validation error');
            mockModel.create.mockRejectedValue(dbError);

            const data = { name: 'John' };

            await expect(SequelizeSvc.createAsync(data, mockModel)).rejects.toThrow();
            expect(logger.error).toHaveBeenCalled();
         });

         it('should log error details on create failure', async () => {
            mockModel.create.mockRejectedValue(new Error('Unique constraint'));

            await expect(SequelizeSvc.createAsync({ id: 1, name: 'John' }, mockModel)).rejects.toThrow();

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Create operation failed'));
         });

         it('should handle foreign key constraint errors', async () => {
            const fkError = new Error('Foreign key constraint violation');
            mockModel.create.mockRejectedValue(fkError);

            await expect(SequelizeSvc.createAsync({ userId: 999 }, mockModel)).rejects.toThrow();
         });

         it('should handle validation errors from Sequelize', async () => {
            const validationError = new Error('Validation error: email is required');
            mockModel.create.mockRejectedValue(validationError);

            await expect(SequelizeSvc.createAsync({ name: 'John' }, mockModel)).rejects.toThrow();
         });
      });

      describe('Edge Cases', () => {
         it('should handle large data objects', async () => {
            const largeData = {
               name: 'A'.repeat(1000),
               description: 'B'.repeat(10000),
            };
            mockModel.create.mockResolvedValue({ id: 1, ...largeData });

            const result = await SequelizeSvc.createAsync(largeData, mockModel);

            expect(result).toBeDefined();
         });

         it('should handle data with special characters', async () => {
            const data = {
               name: "O'Brien",
               description: 'Test\n\twith\rspecial"chars',
            };
            mockModel.create.mockResolvedValue({ id: 1, ...data });

            const result = await SequelizeSvc.createAsync(data, mockModel);

            expect(result).toBeDefined();
         });

         it('should handle data with null values', async () => {
            const data = {
               name: 'John',
               middleName: null,
               suffix: null,
            };
            mockModel.create.mockResolvedValue({ id: 1, ...data });

            const result = await SequelizeSvc.createAsync(data, mockModel);

            expect(result).toBeDefined();
         });
      });
   });

   describe('Integration Scenarios', () => {
      let mockModel;

      beforeEach(() => {
         sequelizeSvc = new SequelizeSvc(mockSequelizeInstance);
         mockModel = {
            upsert: vi.fn(),
            create: vi.fn(),
            NAME: 'UserModel',
            FIELDS: ['id', 'name'],
         };
      });

      it('should connect, perform operations, and disconnect', async () => {
         mockSequelizeInstance.authenticate.mockResolvedValue(undefined);
         mockSequelizeInstance.query.mockResolvedValue([[{ connection_test: 1 }]]);
         mockSequelizeInstance.close.mockResolvedValue(undefined);
         mockModel.create.mockResolvedValue({ id: 1, name: 'John' });

         await sequelizeSvc.connectAsync();
         const result = await SequelizeSvc.createAsync({ name: 'John' }, mockModel);
         await sequelizeSvc.disconnectAsync();

         expect(mockSequelizeInstance.authenticate).toHaveBeenCalled();
         expect(result).toBeDefined();
         expect(mockSequelizeInstance.close).toHaveBeenCalled();
      });

      it('should handle connection failure gracefully', async () => {
         mockSequelizeInstance.authenticate.mockRejectedValue(new Error('Connection failed'));

         await expect(sequelizeSvc.connectAsync()).rejects.toThrow();
         expect(logger.error).toHaveBeenCalled();
      });
   });

   // describe('syncModelAsync() - Static Method', () => {
   //    let mockModel;
   //    let originalEnv;
   //
   //    beforeEach(() => {
   //       mockModel = {
   //          sync: vi.fn(),
   //          getTableName: vi.fn().mockReturnValue('test_table'),
   //          name: 'TestModel',
   //       };
   //       originalEnv = Constants.RUNNING_ENVIRONMENT;
   //    });
   //
   //    afterEach(() => {
   //       Constants.RUNNING_ENVIRONMENT = originalEnv;
   //    });
   //
   //    describe('Development Environment', () => {
   //       beforeEach(() => {
   //          Constants.RUNNING_ENVIRONMENT = 'development';
   //       });
   //
   //       it('should sync model with default options in development', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).toHaveBeenCalledTimes(1);
   //          expect(mockModel.sync).toHaveBeenCalledWith({
   //             alter: true,
   //             force: false,
   //          });
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('test_table synced successfully'));
   //       });
   //
   //       it('should sync with alter option', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel, { alter: true });
   //
   //          expect(mockModel.sync).toHaveBeenCalledWith({
   //             alter: true,
   //             force: false,
   //          });
   //       });
   //
   //       it('should sync with force option', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel, { force: true });
   //
   //          expect(mockModel.sync).toHaveBeenCalledWith({
   //             alter: true,
   //             force: true,
   //          });
   //       });
   //
   //       it('should sync with both options disabled', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel, { alter: false, force: false });
   //
   //          expect(mockModel.sync).toHaveBeenCalledWith({
   //             alter: false,
   //             force: false,
   //          });
   //       });
   //
   //       it('should handle model with only name property', async () => {
   //          const modelWithNameOnly = {
   //             sync: vi.fn().mockResolvedValue(undefined),
   //             NAME: 'TestModel',
   //          };
   //
   //          await SequelizeSvc.syncModelAsync(modelWithNameOnly);
   //
   //          expect(modelWithNameOnly.sync).toHaveBeenCalledTimes(1);
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('TestModel synced successfully'));
   //       });
   //
   //       it('should handle model without getTableName or name', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //          delete mockModel.getTableName;
   //          delete mockModel.name;
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).toHaveBeenCalledTimes(1);
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Unknown synced successfully'));
   //       });
   //
   //       it('should throw CustomError when sync fails', async () => {
   //          const syncError = new Error('Table does not exist');
   //          mockModel.sync.mockRejectedValue(syncError);
   //
   //          await expect(SequelizeSvc.syncModelAsync(mockModel)).rejects.toThrow();
   //       });
   //
   //       it('should log sync options on successful sync', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel, { alter: false, force: true });
   //
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('"alter":false,"force":true'));
   //       });
   //    });
   //
   //    describe('Local Environment', () => {
   //       beforeEach(() => {
   //          Constants.RUNNING_ENVIRONMENT = 'local';
   //       });
   //
   //       it('should sync model in local environment', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).toHaveBeenCalledTimes(1);
   //          expect(logger.warn).not.toHaveBeenCalled();
   //       });
   //
   //       it('should sync in local environment with numbered suffix', async () => {
   //          Constants.RUNNING_ENVIRONMENT = 'local2';
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).toHaveBeenCalledTimes(1);
   //       });
   //    });
   //
   //    describe('Development with Suffix', () => {
   //       it('should sync in dev environment with numeric suffix', async () => {
   //          Constants.RUNNING_ENVIRONMENT = 'dev1';
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).toHaveBeenCalledTimes(1);
   //          expect(logger.warn).not.toHaveBeenCalled();
   //       });
   //
   //       it('should sync in development environment with uppercase', async () => {
   //          Constants.RUNNING_ENVIRONMENT = 'DEVELOPMENT';
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).toHaveBeenCalledTimes(1);
   //       });
   //    });
   //
   //    describe('Production Environment', () => {
   //       beforeEach(() => {
   //          Constants.RUNNING_ENVIRONMENT = 'production';
   //       });
   //
   //       it('should not sync in production environment', async () => {
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //          expect(logger.warn).toHaveBeenCalledWith(
   //             expect.stringContaining('Model sync is disabled for test_table in production'),
   //          );
   //       });
   //
   //       it('should not sync even with force option in production', async () => {
   //          await SequelizeSvc.syncModelAsync(mockModel, { force: true });
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //          expect(logger.warn).toHaveBeenCalled();
   //       });
   //
   //       it('should return immediately without error in production', async () => {
   //          await expect(SequelizeSvc.syncModelAsync(mockModel)).resolves.toBeUndefined();
   //       });
   //    });
   //
   //    describe('Other Environments', () => {
   //       it('should not sync in staging environment', async () => {
   //          Constants.RUNNING_ENVIRONMENT = 'staging';
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //          expect(logger.warn).toHaveBeenCalled();
   //       });
   //
   //       it('should not sync in UAT environment', async () => {
   //          Constants.RUNNING_ENVIRONMENT = 'uat';
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //          expect(logger.warn).toHaveBeenCalled();
   //       });
   //
   //       it('should not sync in test environment', async () => {
   //          Constants.RUNNING_ENVIRONMENT = 'test';
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //          expect(logger.warn).toHaveBeenCalled();
   //       });
   //    });
   //
   //    describe('Edge Cases', () => {
   //       beforeEach(() => {
   //          Constants.RUNNING_ENVIRONMENT = 'development';
   //       });
   //
   //       it('should handle undefined RUNNING_ENVIRONMENT', async () => {
   //          Constants.RUNNING_ENVIRONMENT = undefined;
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //          expect(logger.warn).toHaveBeenCalled();
   //       });
   //
   //       it('should handle null RUNNING_ENVIRONMENT', async () => {
   //          Constants.RUNNING_ENVIRONMENT = null;
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //       });
   //
   //       it('should handle empty string RUNNING_ENVIRONMENT', async () => {
   //          Constants.RUNNING_ENVIRONMENT = '';
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(mockModel.sync).not.toHaveBeenCalled();
   //       });
   //
   //       it('should handle empty options object', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel, {});
   //
   //          expect(mockModel.sync).toHaveBeenCalledWith({
   //             alter: true,
   //             force: false,
   //          });
   //       });
   //
   //       it('should handle null options', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //
   //          await SequelizeSvc.syncModelAsync(mockModel, null);
   //
   //          expect(mockModel.sync).toHaveBeenCalledWith({
   //             alter: true,
   //             force: false,
   //          });
   //       });
   //
   //       it('should include error details in thrown CustomError', async () => {
   //          const syncError = new Error('Sync failed');
   //          mockModel.sync.mockRejectedValue(syncError);
   //
   //          try {
   //             await SequelizeSvc.syncModelAsync(mockModel);
   //          } catch (err) {
   //             expect(err.message).toBe('Failed to sync model');
   //             expect(err.className).toBe('SequelizeSvc');
   //             expect(err.functionName).toBe('syncModelAsync');
   //             expect(err.parameters).toEqual({ modelName: 'test_table' });
   //             expect(err.details).toBeDefined();
   //          }
   //       });
   //    });
   //
   //    describe('Model Name Resolution', () => {
   //       beforeEach(() => {
   //          Constants.RUNNING_ENVIRONMENT = 'development';
   //       });
   //
   //       it('should prioritize getTableName over name', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //          mockModel.getTableName.mockReturnValue('TableFromGetTableName');
   //          mockModel.name = 'ModelName';
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('TableFromGetTableName synced successfully'));
   //       });
   //
   //       it('should use name when getTableName returns undefined', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //          mockModel.getTableName.mockReturnValue(undefined);
   //          mockModel.NAME = 'ModelName';
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('ModelName synced successfully'));
   //       });
   //
   //       it('should use Unknown when both are unavailable', async () => {
   //          mockModel.sync.mockResolvedValue(undefined);
   //          delete mockModel.getTableName;
   //          delete mockModel.name;
   //
   //          await SequelizeSvc.syncModelAsync(mockModel);
   //
   //          expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Unknown synced successfully'));
   //       });
   //    });
   // });
});
