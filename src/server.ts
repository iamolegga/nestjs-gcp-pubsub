/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Message, PubSub, Subscription } from '@google-cloud/pubsub';
import { Logger } from '@nestjs/common';
import {
  CustomTransportStrategy,
  Deserializer,
  MessageHandler,
  Server,
} from '@nestjs/microservices';

import { GCPPubSubContext } from './context';
import { Deferred } from './deferred';
import { invariant } from './invariant';
import { GCPPubSubServerOptions } from './options';
import { JSONDeserializer } from './serialization';

export class GCPPubSubStrategy
  extends Server
  implements CustomTransportStrategy
{
  protected readonly logger = new Logger(GCPPubSubStrategy.name);
  protected readonly deserializer: Deserializer;
  private readonly subscriptions: Record<string, Subscription> = {};
  private readonly pubSub: PubSub;
  private readonly deferred = new Deferred();

  constructor(private readonly opts: GCPPubSubServerOptions) {
    super();
    const { subscriptionOpts: _, deserializer, ...conn } = opts;
    this.pubSub = new PubSub(conn);
    this.deserializer = deserializer ?? new JSONDeserializer();
  }

  async listen(callback?: () => void) {
    const { subscriptionOpts } = this.opts;

    for (const [pattern, handler] of this.getHandlers().entries()) {
      const [topic, subscription, ...rest] = pattern.split('/');
      invariant(topic && subscription && rest.length === 0, 'invalid pattern');

      this.logger.log(`subscribing to ${pattern}`);

      this.subscriptions[pattern] = this.pubSub
        .topic(topic)
        .subscription(subscription, (subscriptionOpts ?? {})[pattern])
        .on('message', this.handleMessageWith(pattern, handler))
        .on('error', (err) => this.logger.error(err));
    }
    this.deferred.resolve();

    this.logger.log('start listening to messages');
    if (callback) callback();
  }

  async close() {
    // TODO: add graceful shutdown
    await Promise.all(Object.values(this.subscriptions).map((s) => s.close()));
  }

  on<
    EventKey extends string = string,
    // follow nestjs declarations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    EventCallback extends Function = Function,
  >(event: EventKey, callback: EventCallback) {
    // as we have multiple underlying subscriptions, we need to pass the
    // callback to each one of them as pubsub client is not an event emitter
    // moreover we need to wait for subscriptions creation in listen method
    // so we are going to resolve the promise when we are sure that we have
    // all subscriptions
    void this.deferred.promise.then(() => {
      for (const subscription of Object.values(this.subscriptions)) {
        // @ts-expect-error they put `void` in Subscription `on` method
        subscription.on(event, callback);
      }
    });
  }

  unwrap<T>(): T {
    return this.pubSub as T;
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
