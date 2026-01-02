/**
 * DatabaseError - Normalizes Sequelize database errors into a safe, structured format.
 * Handles validation errors, constraint violations, and general database errors.
 *
 * @extends Error
 */
export default class DatabaseError extends Error {
   static #CLASS_NAME = 'DatabaseError';
   static #ERROR_TYPES = Object.freeze({
      VALIDATION: 'SequelizeValidationError',
      UNIQUE_CONSTRAINT: 'SequelizeUniqueConstraintError',
      DATABASE: 'SequelizeDatabaseError',
   });

   #data;
   #originalError;

   /**
    * Creates a DatabaseError instance.
    *
    * @param {Object} [data={}] - Additional context data (e.g., query parameters, model info)
    * @param {Object} [error={}] - Original Sequelize error object
    * @param {string} [error.name] - Sequelize error name
    * @param {string} [error.message] - Error message
    * @param {Array} [error.errors] - Validation/constraint error details
    * @param {Object} [error.parent] - Parent error object (for database errors)
    * @param {Array} [error.parent.errors] - Nested error details
    */
   constructor(data = {}, error = {}) {
      const message = error?.message || 'Database operation failed';
      super(message);

      this.name = DatabaseError.#CLASS_NAME;
      this.#data = data;
      this.#originalError = error;
   }

   /**
    * Converts the error into a normalized plain object.
    * Extracts relevant information based on Sequelize error type.
    *
    * @returns {Object} Normalized error object
    * @returns {string} return.className - Error class name
    * @returns {string} return.name - Sequelize error type
    * @returns {string} return.message - Error message
    * @returns {Object} [return.details] - Structured error details (if available)
    * @returns {Object} [return.data] - Additional context data (if provided)
    */
   toObject() {
      const { name, message } = this.#originalError;

      const errorObj = {
         className: DatabaseError.#CLASS_NAME,
         name: name || 'UnknownDatabaseError',
         message: message || 'Unknown database error occurred',
      };

      const details = this.#extractErrorDetails(name);

      if (details && Object.keys(details).length > 0) errorObj.details = details;

      if (this.#data && Object.keys(this.#data).length > 0) errorObj.data = this.#data;

      return errorObj;
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Extracts detailed error information based on Sequelize error type.
    *
    * @private
    * @param {string} errorName - Sequelize error name
    * @returns {Object} Structured error details
    */
   #extractErrorDetails(errorName) {
      switch (errorName) {
         case DatabaseError.#ERROR_TYPES.VALIDATION:
         case DatabaseError.#ERROR_TYPES.UNIQUE_CONSTRAINT:
            return this.#extractValidationErrors();

         case DatabaseError.#ERROR_TYPES.DATABASE:
            return this.#extractDatabaseErrors();

         default:
            return {};
      }
   }

   /**
    * Extracts validation and constraint error details.
    * Handles SequelizeValidationError and SequelizeUniqueConstraintError.
    *
    * @private
    * @returns {Object} Validation error details indexed by item number
    */
   #extractValidationErrors() {
      const errors = this.#originalError?.errors;

      if (!Array.isArray(errors) || errors.length === 0) return {};

      return errors.reduce((details, errorDetail, index) => {
         details[`Item #${index + 1}`] = {
            message: errorDetail.message || 'Validation failed',
            type: errorDetail.type || 'unknown',
            path: errorDetail.path || 'unknown',
            value: errorDetail.value,
         };

         return details;
      }, {});
   }

   /**
    * Extracts database-level error details.
    * Handles SequelizeDatabaseError with parent error information.
    *
    * @private
    * @returns {Object} Database error details indexed by item number
    */
   #extractDatabaseErrors() {
      const parentErrors = this.#originalError?.parent?.errors;

      if (!Array.isArray(parentErrors) || parentErrors.length === 0) return {};

      return parentErrors.reduce((details, errorDetail, index) => {
         details[`Item #${index + 1}`] = {
            message: errorDetail.message || 'Database error',
         };

         return details;
      }, {});
   }
}