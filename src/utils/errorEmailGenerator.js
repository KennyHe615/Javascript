import Constants from './constants.js';
import CustomError from './errors/customError.js';

/**
 * ErrorEmailGenerator - Generates formatted email content for error notifications.
 * Provides both plain text and HTML email formats for scheduled job errors.
 *
 * @class ErrorEmailGenerator
 */
export default class ErrorEmailGenerator {
   static #CLASS_NAME = 'ErrorEmailGenerator';
   static #COLORS = Object.freeze({
      error: '#d32f2f',
      warning: '#ffc107',
      warningText: '#856404',
      info: '#1976d2',
      textPrimary: '#333',
      bgLight: '#f5f5f5',
      bgWarning: '#fff3cd',
      bgCode: '#f8f9fa',
   });
   static #STYLES = Object.freeze({
      container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;',
      heading: `color: ${ErrorEmailGenerator.#COLORS.error}; border-bottom: 2px solid ${ErrorEmailGenerator.#COLORS.error}; padding-bottom: 10px;`,
      infoBox: `background-color: ${ErrorEmailGenerator.#COLORS.bgLight}; padding: 15px; border-radius: 5px; margin: 20px 0;`,
      warningBox: `background-color: ${ErrorEmailGenerator.#COLORS.bgWarning}; padding: 15px; border-radius: 5px; border-left: 4px solid ${ErrorEmailGenerator.#COLORS.warning};`,
      codeBlock: `background-color: ${ErrorEmailGenerator.#COLORS.bgCode}; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; margin-top: 10px;`,
      summary: `cursor: pointer; font-weight: bold; color: ${ErrorEmailGenerator.#COLORS.info};`,
      sectionHeading: `margin-top: 0; color: ${ErrorEmailGenerator.#COLORS.textPrimary};`,
      warningHeading: `margin-top: 0; color: ${ErrorEmailGenerator.#COLORS.warningText};`,
   });
   static #JSON_INDENT = 3;
   static #MAX_ERROR_LENGTH = 10000; // Prevent extremely large error object

   /**
    * Generates plain text email content for error notifications.
    *
    * @static
    * @param {string} serviceName - Name of the service that encountered the error
    * @param {string} runningEnv - Current running environment (dev, uat, prod, etc.)
    * @param {Object} errorObj - Error object to include in the email
    * @returns {string} Formatted plain text email content
    */
   static generateErrorEmailText(serviceName, runningEnv, errorObj) {
      try {
         const safeServiceName = ErrorEmailGenerator.#sanitizeText(serviceName);
         const safeRunningEnv = ErrorEmailGenerator.#sanitizeText(runningEnv);
         const errorDetails = ErrorEmailGenerator.#stringifyError(errorObj);

         return `
            [${safeServiceName}] Scheduled Job ERROR!
   
            Job Name: ${safeServiceName}
            Environment: ${safeRunningEnv}
            Project Path: ${Constants.ROOT_FOLDER}
            
            Please check the application logs for more details.
   
            Error Details:
            ${errorDetails}
         `.trim();
      } catch (err) {
         const errObj = new CustomError({
            message: 'Error generating error email text',
            className: ErrorEmailGenerator.#CLASS_NAME,
            functionName: 'generateErrorEmailText',
            parameters: {
               serviceName,
               runningEnv,
            },
            details: err,
         }).toObject();

         return ErrorEmailGenerator.#stringifyError(errObj);
      }
   }

   /**
    * Generates HTML email content for error notifications.
    * Provides a visually formatted email with expandable error details.
    *
    * @static
    * @param {string} serviceName - Name of the service that encountered the error
    * @param {string} runningEnv - Current running environment (dev, uat, prod, etc.)
    * @param {Object} errorObj - Error object to include in the email
    * @returns {string} Formatted HTML email content
    */
   static generateErrorEmailHtml(serviceName, runningEnv, errorObj) {
      try {
         const safeServiceName = ErrorEmailGenerator.#escapeHtml(serviceName);
         const safeRunningEnv = ErrorEmailGenerator.#escapeHtml(runningEnv);
         const safeProjectPath = ErrorEmailGenerator.#escapeHtml(Constants.ROOT_FOLDER || 'Unknown');
         const errorDetails = ErrorEmailGenerator.#stringifyError(errorObj);

         return `           
            <article style="${ErrorEmailGenerator.#STYLES.container}">
               <header>
                  <h2 style="${ErrorEmailGenerator.#STYLES.heading}">Scheduled Job Error Alert</h2>
               </header>
      
               <section style="${ErrorEmailGenerator.#STYLES.infoBox}">
                  <h3 style="${ErrorEmailGenerator.#STYLES.sectionHeading}">Job Information</h3>
                  <p><strong>Job Name:</strong> ${safeServiceName}</p>
                  <p><strong>Environment:</strong> ${safeRunningEnv}</p>
                  <p><strong>Project Path:</strong> ${safeProjectPath}</p>
               </section>
      
               <aside style="${ErrorEmailGenerator.#STYLES.warningBox}">
                  <h3 style="${ErrorEmailGenerator.#STYLES.warningHeading}">Action Required</h3>
                  <p>Please check the application logs for detailed error information and take appropriate action.</p>
               </aside>
      
               <section style="margin-top: 20px;">
                  <details>
                     <summary style="${ErrorEmailGenerator.#STYLES.summary}">Click to view error details</summary>
                     <pre style="${ErrorEmailGenerator.#STYLES.codeBlock}">${ErrorEmailGenerator.#escapeHtml(errorDetails)}</pre>
                  </details>
               </section>
            </article>
         `.trim();
      } catch (err) {
         const errObj = new CustomError({
            message: 'Error generating error email HTML',
            className: ErrorEmailGenerator.#CLASS_NAME,
            functionName: 'generateErrorEmailHtml',
            parameters: {
               serviceName,
               runningEnv,
            },
            details: err,
         }).toObject();

         return ErrorEmailGenerator.#stringifyError(errObj);
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Converts error object to formatted JSON string with error handling.
    *
    * @private
    * @static
    * @param {Object} errorObj - Error object to stringify
    * @returns {string} Formatted JSON string or error message
    */
   static #stringifyError(errorObj) {
      try {
         const jsonString = JSON.stringify(errorObj, null, ErrorEmailGenerator.#JSON_INDENT);

         // Prevent extremely large error objects from breaking the email
         if (jsonString.length > ErrorEmailGenerator.#MAX_ERROR_LENGTH) {
            return `${jsonString.substring(0, ErrorEmailGenerator.#MAX_ERROR_LENGTH)}\n\n... (truncated, error too large)`;
         }

         return jsonString;
      } catch (err) {
         // Handle circular references or other JSON.stringify errors
         return `Error: Unable to serialize error object\nReason: ${err.message}`;
      }
   }

   /**
    * Escapes HTML special characters to prevent injection attacks.
    *
    * @private
    * @static
    * @param {string} text - Text to escape
    * @returns {string} HTML-safe text
    */
   static #escapeHtml(text) {
      if (typeof text !== 'string') return String(text || '');

      const htmlEscapeMap = {
         '&': '&amp;',
         '<': '&lt;',
         '>': '&gt;',
         '"': '&quot;',
         "'": '&#x27;',
         '/': '&#x2F;',
      };

      return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
   }

   /**
    * Sanitizes text for plain text emails by removing control characters.
    *
    * @private
    * @static
    * @param {string} text - Text to sanitize
    * @returns {string} Sanitized text
    */
   static #sanitizeText(text) {
      if (typeof text !== 'string') return String(text || '');

      // Remove control characters except the newline and tab
      return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
   }
}
