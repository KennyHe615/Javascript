import { describe, it, expect } from 'vitest';
import DatabaseError from '../../../src/utils/errors/databaseError.js';

describe('DatabaseError', () => {
   describe('constructor', () => {
      it('should create instance with default message when no error provided', () => {
         const dbError = new DatabaseError();

         expect(dbError).toBeInstanceOf(Error);
         expect(dbError).toBeInstanceOf(DatabaseError);
         expect(dbError.name).toBe('DatabaseError');
         expect(dbError.message).toBe('Database operation failed');
      });

      it('should create instance with custom error message', () => {
         const error = { message: 'Connection timeout' };
         const dbError = new DatabaseError({}, error);

         expect(dbError.message).toBe('Connection timeout');
         expect(dbError.name).toBe('DatabaseError');
      });

      it('should create instance with data and error', () => {
         const data = { table: 'users', operation: 'INSERT' };
         const error = { message: 'Duplicate entry' };
         const dbError = new DatabaseError(data, error);

         expect(dbError.message).toBe('Duplicate entry');
         expect(dbError.name).toBe('DatabaseError');
      });

      it('should create instance with empty data and error objects', () => {
         const dbError = new DatabaseError({}, {});

         expect(dbError.message).toBe('Database operation failed');
         expect(dbError.name).toBe('DatabaseError');
      });

      it('should create instance with null error', () => {
         const dbError = new DatabaseError({}, null);

         expect(dbError.message).toBe('Database operation failed');
         expect(dbError.name).toBe('DatabaseError');
      });

      it('should create instance with undefined error', () => {
         const dbError = new DatabaseError(undefined, undefined);

         expect(dbError.message).toBe('Database operation failed');
         expect(dbError.name).toBe('DatabaseError');
      });
   });

   describe('toObject - basic structure', () => {
      it('should return error object with minimal information', () => {
         const error = {
            name: 'SequelizeConnectionError',
            message: 'Failed to connect to database',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeConnectionError',
            message: 'Failed to connect to database',
         });
      });

      it('should include data when provided', () => {
         const data = { table: 'products', id: 123 };
         const error = {
            name: 'SequelizeTimeoutError',
            message: 'Query timeout',
         };
         const dbError = new DatabaseError(data, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeTimeoutError',
            message: 'Query timeout',
            data: { table: 'products', id: 123 },
         });
      });

      it('should not include data when empty object', () => {
         const error = {
            name: 'SequelizeError',
            message: 'Generic error',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('data');
      });

      it('should not include data when null', () => {
         const error = {
            name: 'SequelizeError',
            message: 'Generic error',
         };
         const dbError = new DatabaseError(null, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('data');
      });

      it('should use default name when error name is missing', () => {
         const error = {
            message: 'Something went wrong',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.name).toBe('UnknownDatabaseError');
         expect(result.message).toBe('Something went wrong');
      });

      it('should use default message when error message is missing', () => {
         const error = {
            name: 'CustomError',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.name).toBe('CustomError');
         expect(result.message).toBe('Unknown database error occurred');
      });

      it('should use defaults when both name and message are missing', () => {
         const dbError = new DatabaseError({}, {});
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'UnknownDatabaseError',
            message: 'Unknown database error occurred',
         });
      });
   });

   describe('toObject - SequelizeValidationError', () => {
      it('should extract validation error details', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [
               {
                  message: 'email cannot be null',
                  type: 'notNull Violation',
                  path: 'email',
                  value: null,
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeValidationError',
            message: 'Validation error',
            details: {
               'Item #1': {
                  message: 'email cannot be null',
                  type: 'notNull Violation',
                  path: 'email',
                  value: null,
               },
            },
         });
      });

      it('should handle multiple validation errors', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [
               {
                  message: 'email cannot be null',
                  type: 'notNull Violation',
                  path: 'email',
                  value: null,
               },
               {
                  message: 'username must be unique',
                  type: 'unique violation',
                  path: 'username',
                  value: 'johndoe',
               },
               {
                  message: 'age must be a number',
                  type: 'Validation error',
                  path: 'age',
                  value: 'invalid',
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'email cannot be null',
               type: 'notNull Violation',
               path: 'email',
               value: null,
            },
            'Item #2': {
               message: 'username must be unique',
               type: 'unique violation',
               path: 'username',
               value: 'johndoe',
            },
            'Item #3': {
               message: 'age must be a number',
               type: 'Validation error',
               path: 'age',
               value: 'invalid',
            },
         });
      });

      it('should use default values for missing validation error properties', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [
               {
                  value: 'test',
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'Validation failed',
               type: 'unknown',
               path: 'unknown',
               value: 'test',
            },
         });
      });

      it('should handle validation errors with undefined value', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [
               {
                  message: 'field is required',
                  type: 'required',
                  path: 'field',
                  value: undefined,
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details['Item #1'].value).toBeUndefined();
      });

      it('should handle validation errors with various value types', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [
               {
                  message: 'test 1',
                  type: 'type1',
                  path: 'path1',
                  value: 0,
               },
               {
                  message: 'test 2',
                  type: 'type2',
                  path: 'path2',
                  value: false,
               },
               {
                  message: 'test 3',
                  type: 'type3',
                  path: 'path3',
                  value: '',
               },
               {
                  message: 'test 4',
                  type: 'type4',
                  path: 'path4',
                  value: { nested: 'object' },
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details['Item #1'].value).toBe(0);
         expect(result.details['Item #2'].value).toBe(false);
         expect(result.details['Item #3'].value).toBe('');
         expect(result.details['Item #4'].value).toEqual({ nested: 'object' });
      });

      it('should not include details when errors array is empty', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when errors is not an array', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: 'not an array',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when errors is null', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: null,
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when errors is undefined', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });
   });

   describe('toObject - SequelizeUniqueConstraintError', () => {
      it('should extract unique constraint error details', () => {
         const error = {
            name: 'SequelizeUniqueConstraintError',
            message: 'Unique constraint error',
            errors: [
               {
                  message: 'email must be unique',
                  type: 'unique violation',
                  path: 'email',
                  value: 'test@example.com',
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeUniqueConstraintError',
            message: 'Unique constraint error',
            details: {
               'Item #1': {
                  message: 'email must be unique',
                  type: 'unique violation',
                  path: 'email',
                  value: 'test@example.com',
               },
            },
         });
      });

      it('should handle multiple unique constraint violations', () => {
         const error = {
            name: 'SequelizeUniqueConstraintError',
            message: 'Unique constraint error',
            errors: [
               {
                  message: 'username must be unique',
                  type: 'unique violation',
                  path: 'username',
                  value: 'john',
               },
               {
                  message: 'email must be unique',
                  type: 'unique violation',
                  path: 'email',
                  value: 'john@example.com',
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'username must be unique',
               type: 'unique violation',
               path: 'username',
               value: 'john',
            },
            'Item #2': {
               message: 'email must be unique',
               type: 'unique violation',
               path: 'email',
               value: 'john@example.com',
            },
         });
      });

      it('should not include details when errors array is empty', () => {
         const error = {
            name: 'SequelizeUniqueConstraintError',
            message: 'Unique constraint error',
            errors: [],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });
   });

   describe('toObject - SequelizeDatabaseError', () => {
      it('should extract database error details from parent', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: {
               errors: [
                  {
                     message: 'Foreign key constraint failed',
                  },
               ],
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            details: {
               'Item #1': {
                  message: 'Foreign key constraint failed',
               },
            },
         });
      });

      it('should handle multiple parent errors', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: {
               errors: [
                  {
                     message: 'Foreign key constraint failed',
                  },
                  {
                     message: 'Check constraint violation',
                  },
                  {
                     message: 'Column does not exist',
                  },
               ],
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'Foreign key constraint failed',
            },
            'Item #2': {
               message: 'Check constraint violation',
            },
            'Item #3': {
               message: 'Column does not exist',
            },
         });
      });

      it('should use default message when parent error message is missing', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: {
               errors: [{}],
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'Database error',
            },
         });
      });

      it('should not include details when parent.errors is empty array', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: {
               errors: [],
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when parent.errors is not an array', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: {
               errors: 'not an array',
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when parent.errors is null', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: {
               errors: null,
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when parent is missing', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should not include details when parent is null', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error occurred',
            parent: null,
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });
   });

   describe('toObject - unknown error types', () => {
      it('should handle unknown error type without details', () => {
         const error = {
            name: 'SequelizeCustomError',
            message: 'Custom error message',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeCustomError',
            message: 'Custom error message',
         });
      });

      it('should not extract details for unknown error types even with errors array', () => {
         const error = {
            name: 'SequelizeUnknownError',
            message: 'Unknown error',
            errors: [
               {
                  message: 'Some error',
                  type: 'unknown',
                  path: 'field',
               },
            ],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result).not.toHaveProperty('details');
      });
   });

   describe('toObject - combined scenarios', () => {
      it('should include both details and data', () => {
         const data = { table: 'users', operation: 'INSERT' };
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation failed',
            errors: [
               {
                  message: 'email is required',
                  type: 'notNull Violation',
                  path: 'email',
                  value: null,
               },
            ],
         };
         const dbError = new DatabaseError(data, error);
         const result = dbError.toObject();

         expect(result).toEqual({
            className: 'DatabaseError',
            name: 'SequelizeValidationError',
            message: 'Validation failed',
            details: {
               'Item #1': {
                  message: 'email is required',
                  type: 'notNull Violation',
                  path: 'email',
                  value: null,
               },
            },
            data: { table: 'users', operation: 'INSERT' },
         });
      });

      it('should handle complex data objects', () => {
         const data = {
            query: 'SELECT * FROM users',
            params: [1, 2, 3],
            metadata: {
               timestamp: '2024-01-01',
               user: 'admin',
            },
         };
         const error = {
            name: 'SequelizeConnectionError',
            message: 'Connection failed',
         };
         const dbError = new DatabaseError(data, error);
         const result = dbError.toObject();

         expect(result.data).toEqual(data);
      });
   });

   describe('edge cases', () => {
      it('should handle error with empty string name', () => {
         const error = {
            name: '',
            message: 'Error message',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.name).toBe('UnknownDatabaseError');
      });

      it('should handle error with empty string message', () => {
         const error = {
            name: 'ErrorType',
            message: '',
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.message).toBe('Unknown database error occurred');
      });

      it('should handle validation error with empty error objects in array', () => {
         const error = {
            name: 'SequelizeValidationError',
            message: 'Validation error',
            errors: [{}],
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'Validation failed',
               type: 'unknown',
               path: 'unknown',
               value: undefined,
            },
         });
      });

      it('should handle database error with empty error objects in parent', () => {
         const error = {
            name: 'SequelizeDatabaseError',
            message: 'Database error',
            parent: {
               errors: [{}],
            },
         };
         const dbError = new DatabaseError({}, error);
         const result = dbError.toObject();

         expect(result.details).toEqual({
            'Item #1': {
               message: 'Database error',
            },
         });
      });
   });
});
