import { describe, it, expect } from 'vitest';
import CustomError from '../../../src/utils/errors/customError.js';

describe('CustomError', () => {
   describe('constructor', () => {
      it('should create instance with all properties', () => {
         const error = new CustomError({
            message: 'Test error',
            className: 'TestClass',
            functionName: 'testFunction',
            parameters: { param1: 'value1' },
            details: { detail1: 'info1' },
         });

         expect(error).toBeInstanceOf(Error);
         expect(error).toBeInstanceOf(CustomError);
         expect(error.name).toBe('CustomError');
         expect(error.message).toBe('Test error');
      });

      it('should create instance with only required message', () => {
         const error = new CustomError({
            message: 'Simple error',
         });

         expect(error.message).toBe('Simple error');
         expect(error.name).toBe('CustomError');
      });

      it('should create instance with default empty values', () => {
         const error = new CustomError({
            message: 'Error with defaults',
         });

         const result = error.toObject();

         expect(result.message).toBe('Error with defaults');
         expect(result.className).toBeUndefined();
         expect(result.functionName).toBeUndefined();
         expect(result.parameters).toBeUndefined();
         expect(result.details).toBeUndefined();
      });

      it('should handle empty string for optional fields', () => {
         const error = new CustomError({
            message: 'Test',
            className: '',
            functionName: '',
            parameters: {},
            details: {},
         });

         const result = error.toObject();

         expect(result.className).toBeUndefined();
         expect(result.functionName).toBeUndefined();
         expect(result.parameters).toBeUndefined();
         expect(result.details).toBeUndefined();
      });

      it('should handle null details', () => {
         const error = new CustomError({
            message: 'Test error',
            details: null,
         });

         const result = error.toObject();

         expect(result.message).toBe('Test error');
         expect(result.details).toBeUndefined();
      });

      it('should handle undefined details', () => {
         const error = new CustomError({
            message: 'Test error',
            details: undefined,
         });

         const result = error.toObject();

         expect(result.message).toBe('Test error');
         expect(result.details).toBeUndefined();
      });
   });

   describe('toObject - standard error (Pattern 3)', () => {
      it('should return error object with all fields populated', () => {
         const error = new CustomError({
            message: 'Operation failed',
            className: 'DataService',
            functionName: 'fetchData',
            parameters: { id: 123, type: 'user' },
         });

         const result = error.toObject();

         expect(result).toEqual({
            message: 'Operation failed',
            className: 'DataService',
            functionName: 'fetchData',
            parameters: { id: 123, type: 'user' },
         });
      });

      it('should omit empty className', () => {
         const error = new CustomError({
            message: 'Test error',
            functionName: 'testFunc',
            parameters: { x: 1 },
         });

         const result = error.toObject();

         expect(result.className).toBeUndefined();
         expect(result.functionName).toBe('testFunc');
      });

      it('should omit empty functionName', () => {
         const error = new CustomError({
            message: 'Test error',
            className: 'TestClass',
            parameters: { x: 1 },
         });

         const result = error.toObject();

         expect(result.className).toBe('TestClass');
         expect(result.functionName).toBeUndefined();
      });

      it('should omit empty parameters object', () => {
         const error = new CustomError({
            message: 'Test error',
            className: 'TestClass',
            functionName: 'testFunc',
            parameters: {},
         });

         const result = error.toObject();

         expect(result.parameters).toBeUndefined();
      });

      it('should omit empty details object', () => {
         const error = new CustomError({
            message: 'Test error',
            className: 'TestClass',
            functionName: 'testFunc',
            details: {},
         });

         const result = error.toObject();

         expect(result.details).toBeUndefined();
      });

      it('should include non-object details as string', () => {
         const error = new CustomError({
            message: 'Test error',
            details: 'Simple error detail',
         });

         const result = error.toObject();

         expect(result.details).toBe('Simple error detail');
      });

      it('should include numeric details', () => {
         const error = new CustomError({
            message: 'Test error',
            details: 404,
         });

         const result = error.toObject();

         expect(result.details).toBe(404);
      });

      it('should include boolean details', () => {
         const error = new CustomError({
            message: 'Test error',
            details: false,
         });

         const result = error.toObject();

         expect(result.details).toBe(false);
      });

      it('should handle null parameters', () => {
         const error = new CustomError({
            message: 'Test error',
            parameters: null,
         });

         const result = error.toObject();

         expect(result.parameters).toBeUndefined();
      });

      it('should handle undefined parameters', () => {
         const error = new CustomError({
            message: 'Test error',
            parameters: undefined,
         });

         const result = error.toObject();

         expect(result.parameters).toBeUndefined();
      });
   });

   describe('toObject - wrapped built-in error (Pattern 2)', () => {
      it('should wrap built-in error with detail message as error source', () => {
         const builtInError = new TypeError('Cannot read property of undefined');
         const error = new CustomError({
            message: 'Failed to process user data',
            className: 'UserService',
            functionName: 'getUser',
            parameters: { userId: 123 },
            details: builtInError,
         });

         const result = error.toObject();

         expect(result).toEqual({
            message: 'Failed to process user data',
            className: 'UserService',
            functionName: 'getUser',
            parameters: { userId: 123 },
            details: 'Cannot read property of undefined',
         });
      });

      it('should handle ReferenceError as details', () => {
         const refError = new ReferenceError('variable is not defined');
         const error = new CustomError({
            message: 'Initialization failed',
            details: refError,
         });

         const result = error.toObject();

         expect(result.message).toBe('Initialization failed');
         expect(result.details).toBe('variable is not defined');
      });

      it('should handle Error instance with custom properties', () => {
         const customErr = new Error('Database connection failed');
         customErr.code = 'ECONNREFUSED';

         const error = new CustomError({
            message: 'Database operation failed',
            className: 'DatabaseService',
            details: customErr,
         });

         const result = error.toObject();

         expect(result.message).toBe('Database operation failed');
         expect(result.className).toBe('DatabaseService');
         expect(result.details).toBe('Database connection failed');
         expect(result.code).toBe('ECONNREFUSED');
      });

      it('should preserve additional properties from error details', () => {
         const errorDetails = {
            message: 'Network timeout',
            statusCode: 408,
            retryable: true,
         };

         const error = new CustomError({
            message: 'Request failed',
            details: errorDetails,
         });

         const result = error.toObject();

         expect(result.message).toBe('Request failed');
         expect(result.details).toBe('Network timeout');
         expect(result.statusCode).toBe(408);
         expect(result.retryable).toBe(true);
      });
   });

   describe('toObject - nested error chain (Pattern 1)', () => {
      it('should preserve error chain with nested details', () => {
         const error = new CustomError({
            message: 'High level error',
            className: 'HighLevelService',
            functionName: 'highLevelFunc',
            details: {
               message: 'Mid level error',
               className: 'MidLevelService',
               functionName: 'midLevelFunc',
               details: {
                  message: 'Low level error',
                  errorCode: 'E001',
               },
            },
         });

         const result = error.toObject();

         expect(result).toEqual({
            message: 'Mid level error',
            className: 'MidLevelService',
            functionName: 'midLevelFunc',
            details: {
               message: 'Low level error',
               errorCode: 'E001',
            },
         });
      });

      it('should prioritize lower-level className over current', () => {
         const error = new CustomError({
            message: 'Current error',
            className: 'CurrentClass',
            functionName: 'currentFunc',
            details: {
               message: 'Nested error',
               className: 'NestedClass',
               functionName: 'nestedFunc',
               details: { info: 'deep error' },
            },
         });

         const result = error.toObject();

         expect(result.className).toBe('NestedClass');
         expect(result.functionName).toBe('nestedFunc');
      });

      it('should fallback to current className if nested has empty className', () => {
         const error = new CustomError({
            message: 'Current error',
            className: 'CurrentClass',
            functionName: 'currentFunc',
            details: {
               message: 'Nested error',
               className: '',
               details: { info: 'deep error' },
            },
         });

         const result = error.toObject();

         expect(result.className).toBe('CurrentClass');
      });

      it('should merge parameters with nested taking precedence', () => {
         const error = new CustomError({
            message: 'Current error',
            parameters: { a: 1, b: 2 },
            details: {
               message: 'Nested error',
               parameters: { b: 20, c: 3 },
               details: { info: 'deep' },
            },
         });

         const result = error.toObject();

         expect(result.parameters).toEqual({ a: 1, b: 20, c: 3 });
      });

      it('should handle nested error with null parameters', () => {
         const error = new CustomError({
            message: 'Current error',
            parameters: { a: 1 },
            details: {
               message: 'Nested error',
               parameters: null,
               details: { info: 'deep' },
            },
         });

         const result = error.toObject();

         expect(result.parameters).toEqual({ a: 1 });
      });

      it('should handle current error with null parameters and nested with values', () => {
         const error = new CustomError({
            message: 'Current error',
            parameters: null,
            details: {
               message: 'Nested error',
               parameters: { x: 10 },
               details: { info: 'deep' },
            },
         });

         const result = error.toObject();

         expect(result.parameters).toEqual({ x: 10 });
      });

      it('should use detail message when nested details exist', () => {
         const error = new CustomError({
            message: 'This should be ignored',
            details: {
               message: 'This should be used',
               details: { deepError: 'core issue' },
            },
         });

         const result = error.toObject();

         expect(result.message).toBe('This should be used');
         expect(result.details).toEqual({ deepError: 'core issue' });
      });

      it('should fallback to constructor message if detail message is empty', () => {
         const error = new CustomError({
            message: 'Fallback message',
            details: {
               message: '',
               details: { deepError: 'core issue' },
            },
         });

         const result = error.toObject();

         expect(result.message).toBe('Fallback message');
      });

      it('should handle deep nested error chains', () => {
         const error = new CustomError({
            message: 'Level 1',
            details: {
               message: 'Level 2',
               details: {
                  message: 'Level 3',
                  details: {
                     message: 'Level 4',
                     errorCode: 'DEEP_ERROR',
                  },
               },
            },
         });

         const result = error.toObject();

         expect(result.message).toBe('Level 2');
         expect(result.details).toEqual({
            message: 'Level 3',
            details: {
               message: 'Level 4',
               errorCode: 'DEEP_ERROR',
            },
         });
      });
   });

   describe('toObject - additional info preservation', () => {
      it('should preserve additional properties from details object', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: {
               statusCode: 500,
               timestamp: '2024-01-01',
               retryable: false,
            },
         });

         const result = error.toObject();

         expect(result.statusCode).toBe(500);
         expect(result.timestamp).toBe('2024-01-01');
         expect(result.retryable).toBe(false);
      });

      it('should include all additional properties from details object', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: {
               statusCode: 404,
               emptyString: '',
               emptyObject: {},
               nullValue: null,
               undefinedValue: undefined,
            },
         });

         const result = error.toObject();

         expect(result.statusCode).toBe(404);
         expect(result.emptyString).toBe('');
         expect(result.emptyObject).toEqual({});
         expect(result.nullValue).toBeNull();
         expect(result.undefinedValue).toBeUndefined();
      });

      it('should preserve zero and false values in additional info', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: {
               count: 0,
               isValid: false,
               message: 'Keep this separate',
            },
         });

         const result = error.toObject();

         expect(result.count).toBe(0);
         expect(result.isValid).toBe(false);
         expect(result.details).toBe('Keep this separate');
      });

      it('should preserve array values in additional info', () => {
         const error = new CustomError({
            message: 'Validation failed',
            details: {
               errors: ['Error 1', 'Error 2'],
               codes: [400, 401],
            },
         });

         const result = error.toObject();

         expect(result.errors).toEqual(['Error 1', 'Error 2']);
         expect(result.codes).toEqual([400, 401]);
      });

      it('should preserve nested objects in additional info', () => {
         const error = new CustomError({
            message: 'Complex error',
            details: {
               metadata: {
                  service: 'api',
                  version: '1.0',
               },
            },
         });

         const result = error.toObject();

         expect(result.metadata).toEqual({
            service: 'api',
            version: '1.0',
         });
      });
   });

   describe('edge cases', () => {
      it('should handle error with all empty optional fields', () => {
         const error = new CustomError({
            message: 'Minimal error',
            className: '',
            functionName: '',
            parameters: {},
            details: {},
         });

         const result = error.toObject();

         expect(result).toEqual({
            message: 'Minimal error',
         });
      });

      it('should handle details object with only message property', () => {
         const error = new CustomError({
            message: 'Wrapper message',
            details: {
               message: 'Inner message',
            },
         });

         const result = error.toObject();

         expect(result.message).toBe('Wrapper message');
         expect(result.details).toBe('Inner message');
      });

      it('should handle empty parameters with non-empty nested parameters', () => {
         const error = new CustomError({
            message: 'Test',
            parameters: {},
            details: {
               parameters: { x: 1 },
               details: {},
            },
         });

         const result = error.toObject();

         expect(result.parameters).toEqual({ x: 1 });
      });

      it('should handle non-empty parameters with empty nested parameters', () => {
         const error = new CustomError({
            message: 'Test',
            parameters: { y: 2 },
            details: {
               parameters: {},
               details: {},
            },
         });

         const result = error.toObject();

         expect(result.parameters).toEqual({ y: 2 });
      });

      it('should handle details with message but no nested details', () => {
         const error = new CustomError({
            message: 'Outer message',
            className: 'OuterClass',
            details: {
               message: 'Inner message',
               className: 'InnerClass',
            },
         });

         const result = error.toObject();

         expect(result.message).toBe('Outer message');
         expect(result.className).toBe('InnerClass');
         expect(result.details).toBe('Inner message');
      });

      it('should handle string details', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: 'Simple string detail',
         });

         const result = error.toObject();

         expect(result.details).toBe('Simple string detail');
      });

      it('should handle empty string details', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: '',
         });

         const result = error.toObject();

         expect(result).not.toHaveProperty('details');
      });

      it('should handle number zero as details', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: 0,
         });

         const result = error.toObject();

         expect(result.details).toBe(0);
      });

      it('should handle boolean false as details', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: false,
         });

         const result = error.toObject();

         expect(result.details).toBe(false);
      });

      it('should handle array as details', () => {
         const error = new CustomError({
            message: 'Multiple errors',
            details: ['Error 1', 'Error 2', 'Error 3'],
         });

         const result = error.toObject();

         expect(result.details).toEqual(['Error 1', 'Error 2', 'Error 3']);
      });

      it('should handle empty array as details', () => {
         const error = new CustomError({
            message: 'Error occurred',
            details: [],
         });

         const result = error.toObject();

         expect(result).not.toHaveProperty('details');
      });
   });
});
