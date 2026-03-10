import { Handler } from 'express';
import Joi from 'joi';
import { ValidationError } from '../types/errors';

/**
 * Joi schemas to validate individual parts of an incoming request.
 * Each field is optional — only the provided schemas are validated.
 */
export interface RequestValidationSchemas<TParams, TQuery, TBody> {
  params?: Joi.ObjectSchema<TParams>;
  query?: Joi.ObjectSchema<TQuery>;
  body?: Joi.ObjectSchema<TBody>;
}

const validatePart = async <T>(
  value: object,
  schema: Joi.ObjectSchema<T>
): Promise<T | Joi.ValidationError> => {
  try {
    return await schema.validateAsync(value, { abortEarly: false });
  } catch (error) {
    if (Joi.isError(error)) return error;
    throw error;
  }
};

/**
 * Express middleware factory that validates request params, query, and body against Joi schemas.
 *
 * Validates all provided schemas in a single pass with `abortEarly: false`, collecting every
 * error before responding. On any validation failure, calls `next(ValidationError)` with all
 * error messages joined, and the route handler never runs. On success, the validated (and
 * Joi-coerced) values are attached to `res.locals`:
 *   - `res.locals.validatedParams`
 *   - `res.locals.validatedQuery`
 *   - `res.locals.validatedBody`
 *
 * @param schemas - An object with optional `params`, `query`, and `body` Joi schemas.
 * @returns An Express middleware function.
 */
export const requestValidatorMiddleware = <TParams, TQuery, TBody>(
  schemas: RequestValidationSchemas<TParams, TQuery, TBody>
): Handler => {
  return async (req, res, next) => {
    const errors: Joi.ValidationErrorItem[] = [];

    if (schemas.params) {
      const result = await validatePart(req.params, schemas.params);
      if (Joi.isError(result)) {
        errors.push(...result.details);
      } else {
        res.locals.validatedParams = result;
      }
    }

    if (schemas.query) {
      const result = await validatePart(req.query, schemas.query);
      if (Joi.isError(result)) {
        errors.push(...result.details);
      } else {
        res.locals.validatedQuery = result;
      }
    }

    if (schemas.body) {
      const result = await validatePart(req.body, schemas.body);
      if (Joi.isError(result)) {
        errors.push(...result.details);
      } else {
        res.locals.validatedBody = result;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.map((e) => e.message).join('; ')));
    }

    next();
  };
};
