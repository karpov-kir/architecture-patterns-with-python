import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { FastifySchemaValidationError, SchemaErrorDataVar } from 'fastify/types/schema';

import { NotFoundError } from '../shared/errors/NotFoundError';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { ValidationError, ValidationErrorDetails } from '../shared/errors/ValidationError';

const errorToStatusCode = new Map<
  // eslint-disable-next-line @typescript-eslint/ban-types
  Function,
  number
>([
  [UnprocessableInputError, 400],
  [ValidationError, 400],
  [NotFoundError, 404],
]);

export function errorHandler(
  this: FastifyInstance,
  rawError: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let error: Error = rawError;

  if (rawError.validation) {
    error = convertSchemaValidationError(rawError.validation, rawError.validationContext);
  }

  this.log.error(error);

  const statusCode = errorToStatusCode.get(error.constructor) ?? 500;

  reply.status(statusCode);

  if (statusCode === 500) {
    reply.send(new Error('Internal server error'));
    return;
  }

  return reply.send(formatErrorMessage(error));
}

function formatErrorMessage(error: Error) {
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      details: error.details,
    };
  }

  return {
    message: error.message,
  };
}

function convertSchemaValidationError(
  validationErrors: FastifySchemaValidationError[],
  validationContext?: SchemaErrorDataVar,
) {
  const details: ValidationErrorDetails[] = validationErrors.map(({ message, keyword, params }) => {
    const path: string[] = [];

    if (validationContext) {
      path.push(validationContext);
    }

    if (params.missingProperty) {
      path.push(params.missingProperty as string);
    }

    return {
      message: message ?? 'Invalid input',
      path,
      type: keyword,
    };
  });

  return new ValidationError(details);
}
