export class NotImplementedError extends Error {
  constructor(what, owner) {
    super(`${what} is not implemented yet (owner: ${owner})`);
    this.name = 'NotImplementedError';
    this.code = 'NOT_IMPLEMENTED';
    this.owner = owner;
  }
}
