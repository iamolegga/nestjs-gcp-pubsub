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
import { suite, test } from '@testdeck/jest';

import { GCPPubSubClient, GCPPubSubContext, GCPPubSubStrategy } from '../src';

import { Base } from './base-suite';

@suite
export class ContextSuite extends Base {
  protected patterns: string[] = ['topic-ctx/subscription-ctx'];

  private ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const wg = this.wg;
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      @EventPattern('topic-ctx/subscription-ctx')
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

  @test
  async 'context shoud have original message and pattern'() {
    await this.app.get(this.ctrl).emit();
    await this.wg.wait();
  }

  async after() {
    await this.app.close();
  }
}
