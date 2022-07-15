import { Message } from '@google-cloud/pubsub';
import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
  EventPattern,
  OutgoingEvent,
} from '@nestjs/microservices';
import { suite, test } from '@testdeck/jest';

import {
  GCPPubSubClient,
  GCPPubSubClientOptions,
  GCPPubSubStrategy,
} from '../src';

import { Base } from './base-suite';

@suite
export class Options extends Base {
  protected patterns: string[] = ['topic-opts/subscription-opts'];

  private ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const wg = this.wg;
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      @EventPattern('topic-opts/subscription-opts')
      handle(event: unknown) {
        expect(event).toBe(data);
        wg.done();
      }

      async emit() {
        wg.add(1);
        await this.client.emit('topic-opts', data).toPromise();
      }
    }

    this.ctrl = TestController;

    return {
      imports: [
        ClientsModule.register([
          {
            name: token,
            customClass: GCPPubSubClient,
            options: <GCPPubSubClientOptions>{
              ...this.connectionOpts,
              topicOpts: {
                'topic-opts': {
                  messageOrdering: true,
                },
              },
              serializer: {
                serialize: (v: OutgoingEvent) => Buffer.from(v.data),
              },
            },
          },
        ]),
      ],
      controllers: [TestController],
    };
  }

  get strategy(): CustomTransportStrategy {
    return new GCPPubSubStrategy({
      ...this.connectionOpts,
      subscriptionOpts: {
        'topic-opts/subscription-opts': {
          batching: {
            maxMessages: 1,
          },
        },
      },
      deserializer: {
        deserialize: (v: Message, { pattern }: { pattern: string }) => ({
          pattern,
          data: v.data.toString(),
        }),
      },
    });
  }

  @test
  async 'options should be used'() {
    await this.app.get(this.ctrl).emit();
    await this.wg.wait();
  }

  async after() {
    await this.app.close();
  }
}
