function invariant(testValue: false, message: string): never;
function invariant(testValue: unknown, message: string): asserts testValue;
function invariant(testValue: unknown, message: string): asserts testValue {
  if (!testValue) {
    throw new Error(message);
  }
}

export { invariant };
