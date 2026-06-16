// The project's error type for "looked something up that isn't there".
export class NotFound extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFound";
  }
}
