import { Message } from '@google-cloud/pubsub';
import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';

type GCPPubSubContextArgs = [Message, string];

export class GCPPubSubContext extends BaseRpcContext<GCPPubSubContextArgs> {
  constructor(args: GCPPubSubContextArgs) {
    super(args);
  }

  get message(): Message {
    return this.getArgByIndex(0);
  }

  get pattern(): string {
    return this.getArgByIndex(1);
  }
}
