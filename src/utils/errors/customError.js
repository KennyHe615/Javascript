/**
 * CustomError - General-purpose error wrapper that provides additional context.
 * Supports error chaining to preserve the complete error propagation path.
 * Ensures lower-level error details are not overwritten by higher-level errors.
 *
 * @extends Error
 */
export default class CustomError extends Error {
   static #CLASS_NAME = 'CustomError';

   #className;
   #functionName;
   #parameters;
   #details;

   /**
    * Creates a CustomError instance.
    *
    * @param {Object} options - Error configuration options
    * @param {string} options.message - The error message
    * @param {string} [options.className=''] - Class name where error occurred
    * @param {string} [options.functionName=''] - Function name where error occurred
    * @param {Object} [options.parameters={}] - Function parameters for debugging
    * @param {Object|Error} [options.details={}] - Additional error details or nested error
    */
   constructor({ message, className = '', functionName = '', parameters = {}, details = {} }) {
      super(message);

      this.name = CustomError.#CLASS_NAME;
      this.#className = className;
      this.#functionName = functionName;
      this.#parameters = parameters;
      this.#details = details;
   }

   /**
    * Converts the error to a normalized object representation.
    * Handles error chaining to preserve lower-level error information.
    *
    * Important: Lower-level errors take precedence over higher-level ones
    * to maintain the complete error propagation path.
    *
    * @returns {Object} Normalized error object
    * @returns {string} return.message - Error message
    * @returns {string} [return.className] - Class name where error occurred
    * @returns {string} [return.functionName] - Function name where error occurred
    * @returns {Object} [return.parameters] - Function parameters
    * @returns {Object|string} [return.details] - Error details or nested error chain
    */
   toObject() {
      // Destructure with safer defaults
      const errorDetails = this.#details || {};

      // Extract nested error properties if details is an error object
      const {
         message: detailMessage,
         className: detailClassName,
         functionName: detailFunctionName,
         parameters: detailParameters,
         details: nestedDetails,
         ...additionalInfo
      } = errorDetails;

      // Resolve with precedence: lower-level (details) > current level
      const resolvedClassName = detailClassName || this.#className || '';
      const resolvedFunctionName = detailFunctionName || this.#functionName || '';
      const resolvedParameters = {
         ...(this.#parameters ?? {}),
         ...(detailParameters ?? {}),
      };

      // Determine message and details based on error chaining pattern
      const { message: resolvedMessage, details: resolvedDetails } = this.#resolveMessageAndDetails(
         detailMessage,
         nestedDetails,
      );

      // Build error object with only non-empty fields
      return this.#buildErrorObject({
         message: resolvedMessage,
         className: resolvedClassName,
         functionName: resolvedFunctionName,
         parameters: resolvedParameters,
         details: resolvedDetails,
         additionalInfo,
      });
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Resolves message and details based on error chaining pattern.
    * Preserves the error chain without overwriting lower-level information.
    *
    * Pattern 1: Nested error chain (nestedDetails exists)
    *   - Use detail message as current message
    *   - Preserve nested details as the error chain
    *
    * Pattern 2: Wrapped built-in error (detailMessage without nestedDetails)
    *   - Use constructor message as current message
    *   - Use detail message as the error source
    *
    * Pattern 3: Standard error (no detail message)
    *   - Use constructor message
    *   - Use entire details object
    *
    * @private
    * @param {string} [detailMessage] - Message from wrapped error
    * @param {Object} [nestedDetails] - Nested error details from lower level
    * @returns {Object} Resolved message and details
    * @returns {string} return.message - Resolved error message
    * @returns {Object|string} return.details - Resolved error details
    */
   #resolveMessageAndDetails(detailMessage, nestedDetails) {
      if (nestedDetails) {
         // Pattern 1: Error chain from lower level
         // Keep the chain: current message points to detail message,
         // and nestedDetails preserves the lower-level error
         return {
            message: detailMessage || this.message,
            details: nestedDetails,
         };
      }

      if (detailMessage && !nestedDetails) {
         // Pattern 2: Wrapped built-in error (e.g., TypeError, ReferenceError)
         // Current message is the wrapper context,
         // detailMessage is the actual error source
         return {
            message: this.message,
            details: detailMessage,
         };
      }

      // Pattern 3: Standard error without chaining
      return {
         message: this.message,
         details: this.#details,
      };
   }

   /**
    * Builds the final error object with only non-empty fields.
    * Filters out empty strings, empty objects, and null values.
    *
    * @private
    * @param {Object} config - Error object configuration
    * @param {string} config.message - Error message
    * @param {string} config.className - Class name
    * @param {string} config.functionName - Function name
    * @param {Object} config.parameters - Parameters
    * @param {Object|string} config.details - Error details
    * @param {Object} config.additionalInfo - Additional error properties
    * @returns {Object} Cleaned error object
    */
   #buildErrorObject({ message, className, functionName, parameters, details, additionalInfo }) {
      const errorObj = { message };

      if (className) errorObj.className = className;

      if (functionName) errorObj.functionName = functionName;

      if (this.#hasContent(parameters)) errorObj.parameters = parameters;

      if (this.#hasContent(details)) errorObj.details = details;

      if (this.#hasContent(additionalInfo)) Object.assign(errorObj, additionalInfo);

      return errorObj;
   }

   /**
    * Checks if an object or value has meaningful content.
    *
    * @private
    * @param {*} value - Value to check
    * @returns {boolean} True if value has content
    */
   #hasContent(value) {
      if (value === null || value === undefined) return false;

      if (typeof value === 'string') return value.length > 0;

      if (typeof value === 'object') return Object.keys(value).length > 0;

      return true;
   }
}