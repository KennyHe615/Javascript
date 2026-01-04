import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeMailerSvc } from '../../src/services/nodeMailerSvc.js';
import NodeMailerFactory from '../../src/factories/nodeMailerFactory.js';
import Constants from '../../src/utils/constants.js';
import logger from '../../src/services/winstonSvc.js';

vi.mock('../../src/factories/nodeMailerFactory.js', () => ({
   default: {
      getInstance: vi.fn(),
   },
}));

vi.mock('../../src/utils/constants.js', () => ({
   default: {
      EMAIL_DEFAULT_FROM: 'test@example.com',
      EMAIL_RECIPIENTS: 'recipient@example.com',
      EMAIL_CC_RECIPIENTS: 'cc@example.com',
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

describe('NodeMailerSvc', () => {
   let mockTransporter;
   let nodeMailerSvc;

   beforeEach(() => {
      mockTransporter = {
         sendMail: vi.fn(),
         verify: vi.fn(),
         close: vi.fn(),
      };

      NodeMailerFactory.getInstance.mockReturnValue(mockTransporter);
      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance with factory transporter when no instance provided', () => {
         nodeMailerSvc = new NodeMailerSvc();

         expect(NodeMailerFactory.getInstance).toHaveBeenCalledTimes(1);
         expect(nodeMailerSvc).toBeInstanceOf(NodeMailerSvc);
      });

      it('should use provided transporter instance', () => {
         const customTransporter = {
            sendMail: vi.fn(),
            verify: vi.fn(),
         };

         nodeMailerSvc = new NodeMailerSvc(customTransporter);

         expect(NodeMailerFactory.getInstance).not.toHaveBeenCalled();
         expect(nodeMailerSvc).toBeInstanceOf(NodeMailerSvc);
      });

      it('should set default options from Constants', () => {
         nodeMailerSvc = new NodeMailerSvc();

         expect(nodeMailerSvc).toBeInstanceOf(NodeMailerSvc);
      });

      it('should use custom default options when provided', () => {
         const customDefaults = {
            from: 'custom@example.com',
            to: 'custom-recipient@example.com',
            cc: 'custom-cc@example.com',
         };

         nodeMailerSvc = new NodeMailerSvc(mockTransporter, customDefaults);

         expect(nodeMailerSvc).toBeInstanceOf(NodeMailerSvc);
      });

      it('should freeze default options to prevent mutation', () => {
         nodeMailerSvc = new NodeMailerSvc();

         expect(nodeMailerSvc).toBeInstanceOf(NodeMailerSvc);
      });
   });

   describe('sendEmailAsync()', () => {
      beforeEach(() => {
         nodeMailerSvc = new NodeMailerSvc(mockTransporter);
         mockTransporter.sendMail.mockResolvedValue({ messageId: '123' });
      });

      describe('Success Cases', () => {
         it('should send email with html content', async () => {
            const emailOptions = {
               subject: 'Test Subject',
               html: '<h1>Hello World</h1>',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  subject: 'Test Subject',
                  html: '<h1>Hello World</h1>',
                  from: Constants.EMAIL_DEFAULT_FROM,
                  to: Constants.EMAIL_RECIPIENTS,
               }),
            );
            expect(logger.info).toHaveBeenCalledWith('Email Sent Successfully!', expect.any(Object));
         });

         it('should send email with text content', async () => {
            const emailOptions = {
               subject: 'Test Subject',
               text: 'Hello World',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  subject: 'Test Subject',
                  text: 'Hello World',
               }),
            );
         });

         it('should send email with both html and text', async () => {
            const emailOptions = {
               subject: 'Test Subject',
               html: '<h1>Hello</h1>',
               text: 'Hello',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  html: '<h1>Hello</h1>',
                  text: 'Hello',
               }),
            );
         });

         it('should override default recipients when provided', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               to: 'override@example.com',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  to: 'override@example.com',
               }),
            );
         });

         it('should override default sender when provided', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               from: 'custom-sender@example.com',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  from: 'custom-sender@example.com',
               }),
            );
         });

         it('should include cc when provided', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               cc: 'custom-cc@example.com',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  cc: 'custom-cc@example.com',
               }),
            );
         });

         it('should include attachments when provided', async () => {
            const attachments = [{ filename: 'test.txt', content: 'test content' }];

            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               attachments,
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  attachments,
               }),
            );
         });

         it('should handle array of recipients', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               to: ['user1@example.com', 'user2@example.com'],
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  to: ['user1@example.com', 'user2@example.com'],
               }),
            );
         });

         it('should use default cc from constants', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  cc: Constants.EMAIL_CC_RECIPIENTS,
               }),
            );
         });
      });

      describe('Validation Errors', () => {
         it('should throw error when subject is missing', async () => {
            const emailOptions = {
               html: '<h1>Test</h1>',
            };

            await expect(nodeMailerSvc.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               message: 'Invalid Email Options: "subject" is required',
            });

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
         });

         it('should throw error when both html and text are missing', async () => {
            const emailOptions = {
               subject: 'Test Subject',
            };

            await expect(nodeMailerSvc.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               message: 'Invalid Email Options: either "html" or "text" content is required',
            });

            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
         });

         it('should throw error when recipients are missing and no default', async () => {
            const nodeMailerSvcNoDefaults = new NodeMailerSvc(mockTransporter, {
               from: 'test@example.com',
               to: '',
            });

            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
            };

            await expect(nodeMailerSvcNoDefaults.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               message: 'Invalid Email Options: "to" recipients are required',
            });
         });

         it('should throw error when recipients is empty array', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               to: [],
            };

            await expect(nodeMailerSvc.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               message: 'Invalid Email Options: "to" recipients are required',
            });
         });

         it('should throw error with subject as empty string', async () => {
            const emailOptions = {
               subject: '',
               html: '<p>Test</p>',
            };

            await expect(nodeMailerSvc.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               message: 'Invalid Email Options: "subject" is required',
            });
         });
      });

      describe('Sending Errors', () => {
         it('should throw CustomError when sendMail fails', async () => {
            const sendError = new Error('SMTP connection failed');
            mockTransporter.sendMail.mockRejectedValue(sendError);

            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
            };

            await expect(nodeMailerSvc.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               message: 'Sending Email ERROR!',
               className: 'NodeMailerService',
               functionName: 'sendEmailAsync',
            });

            expect(logger.info).not.toHaveBeenCalled();
         });

         it('should include email details in error parameters', async () => {
            mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

            const emailOptions = {
               subject: 'Important Email',
               html: '<p>Test</p>',
               to: 'specific@example.com',
            };

            await expect(nodeMailerSvc.sendEmailAsync(emailOptions)).rejects.toMatchObject({
               parameters: {
                  subject: 'Important Email',
                  to: 'specific@example.com',
               },
            });
         });
      });

      describe('Edge Cases', () => {
         it('should handle very long subject', async () => {
            const longSubject = 'A'.repeat(1000);
            const emailOptions = {
               subject: longSubject,
               html: '<p>Test</p>',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  subject: longSubject,
               }),
            );
         });

         it('should handle html with special characters', async () => {
            const emailOptions = {
               subject: 'Test',
               html: '<p>Test & "quotes" \'apostrophes\' <script>alert("xss")</script></p>',
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalled();
         });

         it('should not include cc if default is empty and not provided', async () => {
            const nodeMailerSvcNoCc = new NodeMailerSvc(mockTransporter, {
               from: 'test@example.com',
               to: 'recipient@example.com',
               cc: '',
            });

            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
            };

            await nodeMailerSvcNoCc.sendEmailAsync(emailOptions);

            const callArgs = mockTransporter.sendMail.mock.calls[0][0];
            expect(callArgs).not.toHaveProperty('cc');
         });

         it('should handle multiple attachments', async () => {
            const attachments = [
               { filename: 'file1.txt', content: 'content1' },
               { filename: 'file2.pdf', path: '/path/to/file2.pdf' },
               { filename: 'file3.jpg', content: Buffer.from('image') },
            ];

            const emailOptions = {
               subject: 'Test',
               html: '<p>Test</p>',
               attachments,
            };

            await nodeMailerSvc.sendEmailAsync(emailOptions);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
               expect.objectContaining({
                  attachments,
               }),
            );
         });
      });
   });

   describe('verifyConnectionAsync()', () => {
      beforeEach(() => {
         nodeMailerSvc = new NodeMailerSvc(mockTransporter);
      });

      it('should verify connection successfully', async () => {
         mockTransporter.verify.mockResolvedValue(true);

         const result = await nodeMailerSvc.verifyConnectionAsync();

         expect(result).toBe(true);
         expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
         expect(logger.info).toHaveBeenCalledWith('Email Connection Verified Successfully!');
      });

      it('should throw CustomError when verification fails', async () => {
         const verifyError = new Error('Connection timeout');
         mockTransporter.verify.mockRejectedValue(verifyError);

         await expect(nodeMailerSvc.verifyConnectionAsync()).rejects.toThrow('Email Connection Verification ERROR!');
         expect(logger.info).not.toHaveBeenCalled();
      });

      it('should include original error in details', async () => {
         const verifyError = new Error('SMTP server unreachable');
         mockTransporter.verify.mockRejectedValue(verifyError);

         try {
            await nodeMailerSvc.verifyConnectionAsync();
         } catch (error) {
            expect(error.message).toBe('Email Connection Verification ERROR!');
            expect(error.details).toBeDefined();
         }
      });

      it('should handle authentication errors', async () => {
         const authError = new Error('Invalid credentials');
         mockTransporter.verify.mockRejectedValue(authError);

         await expect(nodeMailerSvc.verifyConnectionAsync()).rejects.toThrow('Email Connection Verification ERROR!');
      });
   });

   describe('Integration - Singleton Instance', () => {
      it('should export default singleton instance', async () => {
         const { default: nodeMailerSvc } = await import('../../src/services/nodeMailerSvc.js');

         expect(nodeMailerSvc).toBeInstanceOf(NodeMailerSvc);
      });

      it('should export NodeMailerSvc class for DI', async () => {
         const { NodeMailerSvc: ExportedClass } = await import('../../src/services/nodeMailerSvc.js');

         expect(ExportedClass).toBe(NodeMailerSvc);
      });
   });

   describe('Default Options Behavior', () => {
      it('should merge custom and default options correctly', async () => {
         const customDefaults = {
            from: 'custom@example.com',
            to: 'default-recipient@example.com',
         };

         const testService = new NodeMailerSvc(mockTransporter, customDefaults);
         mockTransporter.sendMail.mockResolvedValue({});

         await testService.sendEmailAsync({
            subject: 'Test',
            html: '<p>Test</p>',
            to: 'override@example.com',
         });

         expect(mockTransporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
               from: 'custom@example.com',
               to: 'override@example.com',
            }),
         );
      });

      it('should use default from when not overridden', async () => {
         const testService = new NodeMailerSvc(mockTransporter);
         mockTransporter.sendMail.mockResolvedValue({});

         await testService.sendEmailAsync({
            subject: 'Test',
            html: '<p>Test</p>',
         });

         expect(mockTransporter.sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
               from: Constants.EMAIL_DEFAULT_FROM,
            }),
         );
      });
   });
});
