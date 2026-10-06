export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function invalid(field, message) {
  throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', [{ field, message }]);
}
