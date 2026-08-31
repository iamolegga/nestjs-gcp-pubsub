import { Message } from '@google-cloud/pubsub';
import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  Ctx,
  CustomTransportStrategy,
  EventPattern,
  Payload,
} from '@nestjs/microservices';

import { GCPPubSubClient, GCPPubSubContext, GCPPubSubStrategy } from '../src';

import { Base, useSuite } from './base-suite';

class ContextSuite extends Base {
  protected patterns: string[] = ['topic-ctx/subscription-ctx'];

  ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const wg = this.wg;
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      // NestJS 12 added a typed-event overload that constrains handlers to
      // `(data, ...args: unknown[])`, which a typed `@Ctx()` parameter does
      // not satisfy. The explicit type argument selects the plain
      // string-pattern overload instead.
      @EventPattern<string>('topic-ctx/subscription-ctx')
      handle(@Payload() event: unknown, @Ctx() ctx: GCPPubSubContext) {
        expect(ctx.message).toBeInstanceOf(Message);
        expect(ctx.pattern).toBe('topic-ctx/subscription-ctx');
        expect(event).toEqual(data);
        wg.done();
      }

      async emit() {
        wg.add(1);
        await this.client.emit('topic-ctx', data).toPromise();
      }
    }

    this.ctrl = TestController;

    return {
      imports: [
        ClientsModule.register([
          {
            name: token,
            customClass: GCPPubSubClient,
            options: this.connectionOpts,
          },
        ]),
      ],
      controllers: [TestController],
    };
  }

  get strategy(): CustomTransportStrategy {
    return new GCPPubSubStrategy(this.connectionOpts);
  }

  async after() {
    await this.app.close();
  }
}

describe('ContextSuite', () => {
  const getSuite = useSuite(() => new ContextSuite());

  it('context shoud have original message and pattern', async () => {
    const suite = getSuite();

    await suite.app.get(suite.ctrl).emit();
    await suite.wg.wait();
  });
});
