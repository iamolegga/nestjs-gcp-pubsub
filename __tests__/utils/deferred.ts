/* eslint-disable @typescript-eslint/ban-ts-comment */

export class Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (err: Error) => void;

  constructor() {
    let resolve, reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // @ts-ignore
    this.resolve = resolve;
    // @ts-ignore
    this.reject = reject;
  }
}
