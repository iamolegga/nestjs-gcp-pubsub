import { Deferred } from '../../src/deferred';

export class WaitGroup {
  private deferred: Deferred;
  private count = 0;

  constructor() {
    this.deferred = new Deferred();
  }

  add(x: number) {
    this.count += x;
  }

  done() {
    this.count--;
    if (this.count <= 0) {
      this.deferred.resolve();
    }
  }

  async wait() {
    return this.deferred.promise;
  }
}
