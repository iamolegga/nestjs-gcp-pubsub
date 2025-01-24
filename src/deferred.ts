export class Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (err: Error) => void;

  constructor() {
    let resolveRef!: () => void;
    let rejectRef!: (err: Error) => void;

    this.promise = new Promise<void>((res, rej) => {
      resolveRef = res;
      rejectRef = rej;
    });

    this.resolve = resolveRef;
    this.reject = rejectRef;
  }
}
