import logger from './winstonSvc.js';
import NodeMailerFactory from '../factories/nodeMailerFactory.js';
import Constants from '../utils/constants.js';
import CustomError from '../utils/errors/customError.js';

/**
 * Service class for sending emails using NodeMailer.
 * Provides a clean API for email operations with support for both singleton usage (convenience)
 * and dependency injection (testing/customization).
 *
 * @class NodeMailerSvc
 */
class NodeMailerSvc {
   static #CLASS_NAME = 'NodeMailerService';

   #transporter;
   #defaultOptions;

   /**
    * Creates a new NodeMailerService instance.
    *
    * @param {import('nodemailer').Transporter} [transporterInstance] - NodeMailer transporter instance (optional)
    * @param {Object} [defaultOptions] - Default email options (optional)
    * @param {string} [defaultOptions.from] - Default sender email address
    * @param {string|string[]} [defaultOptions.to] - Default recipient email addresses
    * @param {string|string[]} [defaultOptions.cc] - Default CC recipient email addresses
    * @throws {Error} If transporter instance is not provided and factory fails
    */
   constructor(transporterInstance = null, defaultOptions = {}) {
      this.#transporter = transporterInstance ?? NodeMailerFactory.getInstance();

      this.#defaultOptions = Object.freeze({
         from: defaultOptions.from ?? Constants.EMAIL_DEFAULT_FROM,
         to: defaultOptions.to ?? Constants.EMAIL_RECIPIENTS,
         cc: defaultOptions.cc ?? Constants.EMAIL_CC_RECIPIENTS,
      });
   }

   /**
    * Sends an email using the configured NodeMailer transporter.
    *
    * @async
    * @param {Object} options - Email options
    * @param {string} options.subject - Email subject (required)
    * @param {string} [options.html] - HTML content of the email
    * @param {string} [options.text] - Plain text content of the email
    * @param {string|string[]} [options.to] - Override default recipients
    * @param {string|string[]} [options.cc] - Override default CC recipients
    * @param {string} [options.from] - Override default sender
    * @param {Object[]} [options.attachments] - Email attachments
    * @returns {Promise<void>}
    * @throws {CustomError} If subject is missing or email sending fails
    */
   async sendEmailAsync(options) {
      this.#validateEmailOptions(options);

      const mailOptions = this.#getMailOptions(options);

      try {
         await this.#transporter.sendMail(mailOptions);

         logger.info('Email Sent Successfully!', { subject: mailOptions.subject, to: mailOptions.to });
      } catch (err) {
         throw new CustomError({
            message: 'Sending Email ERROR!',
            className: NodeMailerSvc.#CLASS_NAME,
            functionName: 'sendEmailAsync',
            parameters: { subject: mailOptions.subject, to: mailOptions.to },
            details: err,
         }).toObject();
      }
   }

   /**
    * Verifies the connection to the email server.
    *
    * @async
    * @returns {Promise<boolean>} Returns true if connection is successful
    * @throws {CustomError} If connection verification fails
    */
   async verifyConnectionAsync() {
      try {
         await this.#transporter.verify();

         logger.info('Email Connection Verified Successfully!');
         return true;
      } catch (err) {
         throw new CustomError({
            message: 'Email Connection Verification ERROR!',
            className: NodeMailerSvc.#CLASS_NAME,
            functionName: 'verifyConnectionAsync',
            details: err,
         }).toObject();
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Validates email options before sending.
    * Ensures required fields (subject, content, recipients) are present and valid.
    * Note: Either 'html' or 'text' content is required, not both.
    *
    * @private
    * @param {Object} options - Email options to validate
    * @param {string} options.subject - Email subject
    * @param {string} [options.html] - HTML content
    * @param {string} [options.text] - Plain text content
    * @param {string|string[]} [options.to] - Recipient email addresses
    * @throws {Object} CustomError object if validation fails
    */
   #validateEmailOptions(options) {
      const errorObj = new CustomError({
         message: '',
         className: NodeMailerSvc.#CLASS_NAME,
         functionName: '#validateEmailOptions',
         parameters: options,
      }).toObject();

      if (!options.subject) {
         errorObj.message = 'Invalid Email Options: "subject" is required';

         throw errorObj;
      }

      if (!options.html && !options.text) {
         errorObj.message = 'Invalid Email Options: either "html" or "text" content is required';

         throw errorObj;
      }

      const recipients = options.to ?? this.#defaultOptions.to;
      if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
         errorObj.message = 'Invalid Email Options: "to" recipients are required';

         throw errorObj;
      }
   }

   /**
    * Builds mail options by merging custom options with defaults.
    * Only includes fields that have actual values to avoid sending undefined properties.
    * Required fields (from, to, subject) are always included.
    * Optional fields (cc, html, text, attachments) are only included if provided.
    *
    * @private
    * @param {Object} options - Custom email options
    * @param {string} options.subject - Email subject (required)
    * @param {string} [options.from] - Sender email address (overrides default)
    * @param {string|string[]} [options.to] - Recipient email addresses (overrides default)
    * @param {string|string[]} [options.cc] - CC recipient email addresses (overrides default)
    * @param {string} [options.html] - HTML content (either html or text required)
    * @param {string} [options.text] - Plain text content (either html or text required)
    * @param {Object[]} [options.attachments] - Email attachments
    * @returns {Object} Complete mail options object ready for nodemailer
    */
   #getMailOptions(options) {
      const mailOptions = {
         from: options.from ?? this.#defaultOptions.from,
         to: options.to ?? this.#defaultOptions.to,
         subject: options.subject,
      };

      if (options.cc ?? this.#defaultOptions.cc) {
         mailOptions.cc = options.cc ?? this.#defaultOptions.cc;
      }

      if (options.html) mailOptions.html = options.html;
      if (options.text) mailOptions.text = options.text;
      if (options.attachments) mailOptions.attachments = options.attachments;

      return mailOptions;
   }
}

/**
 * Default email service instance for application-wide use.
 * This singleton instance should be used in 99% of cases for convenience.
 *
 * @type {NodeMailerSvc}
 */
const nodeMailerSvc = new NodeMailerSvc();

// Export singleton as default (most common usage)
export default nodeMailerSvc;

// Also export the class for DI scenarios (testing, custom instances)
export { NodeMailerSvc };

// Sample Usage
//
// 1. Default singleton (99% of use cases):
// (async () => {
//    await nodeMailerSvc.verifyConnectionAsync();
//
//    await nodeMailerSvc.sendEmailAsync({
//       subject: 'Test Email',
//       html: '<h1>Hello World</h1>',
//       text: 'Hello World',
//    });
// })();
//
// 2. Dependency Injection (for testing):
// import { NodeMailerService } from './services/nodeMailerService.js';
// const mockTransporter = {
//    sendMail: jest.fn(),
//    verify: jest.fn()
// };
// const testEmailService = new NodeMailerService(mockTransporter);
//
// 3. Custom default options:
// import { NodeMailerService } from './services/nodeMailerService.js';
// import NodeMailerFactory from '../factories/nodeMailerFactory.js';
// const customEmailService = new NodeMailerService(
//    NodeMailerFactory.getInstance(),
//    { from: 'custom@example.com', to: 'recipient@example.com' }
// );
