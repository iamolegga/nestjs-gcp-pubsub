/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Message, PubSub, Subscription } from '@google-cloud/pubsub';
import { Logger } from '@nestjs/common';
import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from '@nestjs/microservices';

import { GCPPubSubContext } from './context';
import { invariant } from './invariant';
import { GCPPubSubServerOptions } from './options';
import { JSONDeserializer } from './serialization';

export class GCPPubSubStrategy
  extends Server
  implements CustomTransportStrategy
{
  protected readonly logger = new Logger(GCPPubSubStrategy.name);
  private readonly subscriptions: Record<string, Subscription> = {};

  constructor(private readonly opts: GCPPubSubServerOptions) {
    super();
    this.deserializer = opts.deserializer ?? new JSONDeserializer();
  }

  async listen(callback?: () => void) {
    const { subscriptionOpts, deserializer, ...conn } = this.opts;
    const pubSub = new PubSub(conn);

    for (const [pattern, handler] of this.getHandlers().entries()) {
      const [topic, subscription, ...rest] = pattern.split('/');
      invariant(topic && subscription && rest.length === 0, 'invalid pattern');

      this.logger.log(`subscribing to ${pattern}`);

      this.subscriptions[pattern] = pubSub
        .topic(topic)
        .subscription(subscription, (subscriptionOpts ?? {})[pattern])
        .on('message', this.handleMessageWith(pattern, handler))
        .on('error', (err) => this.logger.error(err));
    }

    this.logger.log('start listening to messages');
    if (callback) callback();
  }

  async close() {
    // TODO: add graceful shutdown
    await Promise.all(Object.values(this.subscriptions).map((s) => s.close()));
  }

  private handleMessageWith(
    pattern: string,
    handler: MessageHandler,
  ): (message: Message) => Promise<void> {
    return async (message: Message): Promise<void> => {
      const logAttributes = `message ${message.id} (attempt #${message.deliveryAttempt}) with pattern ${pattern}`;
      this.logger.debug(`${logAttributes} to be processed`);

      try {
        const packet = await this.deserializer.deserialize(message, {
          pattern,
        });
        const ctx = new GCPPubSubContext([message, pattern]);
        const result = await handler(packet.data, ctx);
        if (result) await result.toPromise();
        this.logger.debug(`${logAttributes} handled successfully`);
        message.ack();
        // @ts-ignore
      } catch (e: Error) {
        this.logger.debug(
          `error thrown while processing ${logAttributes}: ${JSON.stringify(
            e,
          )}`,
        );
        message.nack();
      } finally {
        this.logger.debug(`${logAttributes} processed`);
      }
    };
  }
}
