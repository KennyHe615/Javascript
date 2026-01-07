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
         it('should throw CustomError when upsert fails', async () => {
            const dbError = new Error('Unique constraint violation');
            mockModel.upsert.mockRejectedValue(dbError);

            const data = { id: 1, name: 'John' };

            await expect(SequelizeSvc.upsertAsync(data, mockModel)).rejects.toThrow();
            expect(logger.error).toHaveBeenCalled();
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

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Upsert operation failed'));
         });
      });

      describe('Concurrent Operations', () => {
         it('should handle multiple concurrent upserts', async () => {
            mockModel.upsert.mockResolvedValue([{}, true]);

            const data = [
               { id: 1, name: 'John' },
               { id: 2, name: 'Jane' },
               { id: 3, name: 'Bob' },
            ];

            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(mockModel.upsert).toHaveBeenCalledTimes(3);
         });

         it('should wait for all upserts to complete', async () => {
            let callOrder = [];
            mockModel.upsert.mockImplementation(async (data) => {
               await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
               callOrder.push(data.id);
               return [{}, true];
            });

            const data = [
               { id: 1, name: 'John' },
               { id: 2, name: 'Jane' },
            ];

            await SequelizeSvc.upsertAsync(data, mockModel);

            expect(callOrder).toHaveLength(2);
            expect(callOrder).toContain(1);
            expect(callOrder).toContain(2);
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
});
