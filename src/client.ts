import { PubSub, Topic } from '@google-cloud/pubsub';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';

import { invariant } from './invariant';
import { GCPPubSubClientOptions } from './options';
import { JSONSerializer } from './serialization';

export class GCPPubSubClient extends ClientProxy {
  private readonly topics: Record<string, Topic> = {};
  private readonly pubSub: PubSub;

  constructor(private readonly config: GCPPubSubClientOptions) {
    super();
    const { topicOpts, serializer, ...conn } = config;
    this.pubSub = new PubSub(conn);
    this.serializer = serializer ?? new JSONSerializer();
  }

  async connect(): Promise<void> {
    // noop
  }

  async close() {
    // noop
  }

  unwrap<T>(): T {
    return this.pubSub as T;
  }

  publish(
    _packet: ReadPacket<unknown>,
    _callback: (packet: WritePacket<unknown>) => void,
  ): () => void {
    throw new Error('request-response messages are not supported');
  }

  // something with types, unable to set void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async dispatchEvent(packet: ReadPacket<unknown>): Promise<any> {
    invariant(
      typeof packet.pattern === 'string',
      'pattern must be a valid PubSub topic name',
    );

    const data = await this.serializer.serialize(packet);
    await this.getOrCreateTopic(packet.pattern).publishMessage({ data });
  }

  private getOrCreateTopic(pattern: string): Topic {
    let topic = this.topics[pattern];
    if (topic) return topic;

    topic = this.pubSub.topic(pattern, (this.config.topicOpts ?? {})[pattern]);
    this.topics[pattern] = topic;
    return topic;
  }
}
