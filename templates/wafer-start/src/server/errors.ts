export class ServiceUnavailableError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = "ServiceUnavailableError";
    this.status = status;
  }
}
