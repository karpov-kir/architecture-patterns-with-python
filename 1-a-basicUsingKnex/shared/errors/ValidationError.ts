export interface ValidationErrorDetails {
  path: Array<string>;
  message: string;
  type: string;
}

export class ValidationError extends Error {
  public readonly details;

  constructor(details: ValidationErrorDetails[], message = 'Validation error') {
    super(message);
    this.details = details;
  }
}
