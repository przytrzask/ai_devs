export class ValidationError {
  readonly _tag = "ValidationError";
}

export class HttpError {
  constructor(public error?: any) {
    this.error = error;
  }

  readonly _tag = "HttpError";
}
