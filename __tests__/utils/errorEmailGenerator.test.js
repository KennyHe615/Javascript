import { describe, it, expect, beforeEach } from 'vitest';
import ErrorEmailGenerator from '../../src/utils/errorEmailGenerator.js';
import Constants from '../../src/utils/constants.js';

describe('ErrorEmailGenerator', () => {
   let mockError;
   let serviceName;
   let runningEnv;

   beforeEach(() => {
      serviceName = 'TestService';
      runningEnv = 'production';
      mockError = {
         message: 'Test error message',
         code: 'ERR_TEST',
         stack: 'Error stack trace',
      };
   });

   describe('generateErrorEmailText', () => {
      it('should generate plain text email with all required fields', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, mockError);

         expect(result).toContain(`[${serviceName}] Scheduled Job ERROR!`);
         expect(result).toContain(`Job Name: ${serviceName}`);
         expect(result).toContain(`Environment: ${runningEnv}`);
         expect(result).toContain(`Project Path: ${Constants.ROOT_FOLDER}`);
         expect(result).toContain('Please check the application logs for more details.');
         expect(result).toContain('Error Details:');
         expect(result).toContain(mockError.message);
      });

      it('should stringify error object correctly', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, mockError);

         expect(result).toContain('"message": "Test error message"');
         expect(result).toContain('"code": "ERR_TEST"');
         expect(result).toContain('"stack": "Error stack trace"');
      });

      it('should sanitize serviceName with control characters', () => {
         const dirtyServiceName = 'Test\x00Service\x07';
         const result = ErrorEmailGenerator.generateErrorEmailText(dirtyServiceName, runningEnv, mockError);

         expect(result).toContain('Job Name: TestService');
         expect(result).not.toContain('\x00');
         expect(result).not.toContain('\x07');
      });

      it('should sanitize runningEnv with control characters', () => {
         const dirtyEnv = 'prod\x1Fuction\x7F';
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, dirtyEnv, mockError);

         expect(result).toContain('Environment: production');
         expect(result).not.toContain('\x1F');
         expect(result).not.toContain('\x7F');
      });

      it('should handle non-string serviceName', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(123, runningEnv, mockError);

         expect(result).toContain('Job Name: 123');
      });

      it('should handle null serviceName', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(null, runningEnv, mockError);

         expect(result).toContain('Job Name:');
      });

      it('should handle undefined runningEnv', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, undefined, mockError);

         expect(result).toContain('Environment:');
      });

      it('should handle circular reference in error object', () => {
         const circularError = { message: 'Circular error' };
         circularError.self = circularError;

         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, circularError);

         expect(result).toContain('Unable to serialize error object');
      });

      it('should handle empty error object', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, {});

         expect(result).toContain('Error Details:');
         expect(result).toContain('{}');
      });

      it('should handle null error object', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, null);

         expect(result).toContain('null');
      });

      it('should truncate extremely large error objects', () => {
         const largeError = {
            message: 'Large error',
            data: 'x'.repeat(15000),
         };

         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, largeError);

         expect(result).toContain('... (truncated, error too large)');
      });

      it('should handle error during text generation', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, undefined);

         expect(result).toBeDefined();
         expect(typeof result).toBe('string');
      });
   });

   describe('generateErrorEmailHtml', () => {
      it('should generate HTML email with proper structure', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, mockError);

         expect(result).toContain('<article');
         expect(result).toContain('<header>');
         expect(result).toContain('<h2');
         expect(result).toContain('Scheduled Job Error Alert');
         expect(result).toContain('</article>');
      });

      it('should include all required information sections', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, mockError);

         expect(result).toContain('Job Information');
         expect(result).toContain(`Job Name:</strong> ${serviceName}`);
         expect(result).toContain(`Environment:</strong> ${runningEnv}`);
         expect(result).toContain(`Project Path:</strong>`);
         expect(result).toContain('Action Required');
         expect(result).toContain('Please check the application logs');
      });

      it('should include expandable error details section', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, mockError);

         expect(result).toContain('<details>');
         expect(result).toContain('<summary');
         expect(result).toContain('Click to view error details');
         expect(result).toContain('<pre');
         expect(result).toContain('</details>');
      });

      it('should escape HTML special characters in serviceName', () => {
         const htmlServiceName = '<script>alert("xss")</script>';
         const result = ErrorEmailGenerator.generateErrorEmailHtml(htmlServiceName, runningEnv, mockError);

         expect(result).not.toContain('<script>');
         expect(result).toContain('&lt;script&gt;');
         expect(result).toContain('&lt;&#x2F;script&gt;');
      });

      it('should escape HTML special characters in runningEnv', () => {
         const htmlEnv = 'prod&test<>"\'';
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, htmlEnv, mockError);

         expect(result).toContain('&amp;');
         expect(result).toContain('&lt;');
         expect(result).toContain('&gt;');
         expect(result).toContain('&quot;');
         expect(result).toContain('&#x27;');
      });

      it('should escape all HTML special characters', () => {
         const specialChars = '& < > " \' /';
         const result = ErrorEmailGenerator.generateErrorEmailHtml(specialChars, runningEnv, mockError);

         expect(result).toContain('&amp;');
         expect(result).toContain('&lt;');
         expect(result).toContain('&gt;');
         expect(result).toContain('&quot;');
         expect(result).toContain('&#x27;');
         expect(result).toContain('&#x2F;');
      });

      it('should escape error details in HTML', () => {
         const htmlError = {
            message: '<img src=x onerror=alert(1) alt="">',
            code: 'TEST&CODE',
         };
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, htmlError);

         expect(result).not.toContain('<img src=x');
         expect(result).toContain('&lt;img');
         expect(result).toContain('TEST&amp;CODE');
      });

      it('should handle non-string serviceName in HTML', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(456, runningEnv, mockError);

         expect(result).toContain('Job Name:</strong> 456');
      });

      it('should handle null runningEnv in HTML', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, null, mockError);

         expect(result).toContain('Environment:</strong>');
      });

      it('should handle undefined project path', () => {
         const originalRootFolder = Constants.ROOT_FOLDER;
         Constants.ROOT_FOLDER = undefined;

         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, mockError);

         expect(result).toContain('Project Path:</strong> Unknown');

         Constants.ROOT_FOLDER = originalRootFolder;
      });

      it('should handle circular reference in error object for HTML', () => {
         const circularError = { message: 'Circular error' };
         circularError.self = circularError;

         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, circularError);

         expect(result).toContain('Unable to serialize error object');
      });

      it('should truncate large error objects in HTML', () => {
         const largeError = {
            message: 'Large error',
            data: 'x'.repeat(15000),
         };

         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, largeError);

         expect(result).toContain('... (truncated, error too large)');
      });

      it('should include proper CSS styling', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, mockError);

         expect(result).toContain('font-family: Arial, sans-serif');
         expect(result).toContain('max-width: 600px');
         expect(result).toContain('color: #d32f2f');
         expect(result).toContain('background-color: #f5f5f5');
         expect(result).toContain('background-color: #fff3cd');
      });

      it('should use semantic HTML tags', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, mockError);

         expect(result).toContain('<article');
         expect(result).toContain('<header>');
         expect(result).toContain('<section');
         expect(result).toContain('<aside');
      });

      it('should handle error during HTML generation', () => {
         const result = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, undefined);

         expect(result).toBeDefined();
         expect(typeof result).toBe('string');
      });
   });

   describe('Edge Cases and Error Handling', () => {
      it('should handle empty strings for all parameters', () => {
         const textResult = ErrorEmailGenerator.generateErrorEmailText('', '', {});
         const htmlResult = ErrorEmailGenerator.generateErrorEmailHtml('', '', {});

         expect(textResult).toBeDefined();
         expect(htmlResult).toBeDefined();
         expect(textResult).toContain('Job Name:');
         expect(htmlResult).toContain('Job Name:</strong>');
      });

      it('should handle complex nested error objects', () => {
         const complexError = {
            message: 'Complex error',
            nested: {
               level1: {
                  level2: {
                     level3: 'Deep value',
                  },
               },
            },
            array: [1, 2, 3],
         };

         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, complexError);

         expect(result).toContain('Complex error');
         expect(result).toContain('Deep value');
      });

      it('should preserve newlines and tabs in sanitized text', () => {
         const textWithWhitespace = 'Line1\nLine2\tTabbed';
         const result = ErrorEmailGenerator.generateErrorEmailText(textWithWhitespace, runningEnv, mockError);

         expect(result).toContain('Line1\nLine2\tTabbed');
      });

      it('should handle special characters in error messages', () => {
         const specialError = {
            message: 'Error with special chars: @#$%^&*()',
            code: 'SPECIAL_123',
         };

         const textResult = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, specialError);
         const htmlResult = ErrorEmailGenerator.generateErrorEmailHtml(serviceName, runningEnv, specialError);

         expect(textResult).toContain('@#$%^&*()');
         expect(htmlResult).toContain('SPECIAL_123');
      });

      it('should handle error objects with symbols', () => {
         const errorWithSymbol = {
            message: 'Error with symbol',
            [Symbol('test')]: 'symbol value',
         };

         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, errorWithSymbol);

         expect(result).toBeDefined();
         expect(result).toContain('Error with symbol');
      });

      it('should format JSON with proper indentation', () => {
         const result = ErrorEmailGenerator.generateErrorEmailText(serviceName, runningEnv, mockError);

         expect(result).toMatch(/\{\s+"/);
      });
   });
});
