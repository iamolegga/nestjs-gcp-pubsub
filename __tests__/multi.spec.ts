import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
  EventPattern,
} from '@nestjs/microservices';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base, useSuite } from './base-suite';

class Multi extends Base {
  protected patterns: string[] = [
    'topic-multi/subscription-multi-1',
    'topic-multi/subscription-multi-2',
  ];

  ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const wg = this.wg;
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      @EventPattern('topic-multi/subscription-multi-1')
      handle1(event: unknown) {
        expect(event).toBe(data);
        wg.done();
      }

      @EventPattern('topic-multi/subscription-multi-2')
      handle2(event: unknown) {
        expect(event).toBe(data);
        wg.done();
      }

      async emit() {
        wg.add(2);
        await this.client.emit('topic-multi', data).toPromise();
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

describe('Multi', () => {
  const getSuite = useSuite(() => new Multi());

  it('should send and receive same data in two subscriptions', async () => {
    const suite = getSuite();

    await suite.app.get(suite.ctrl).emit();
    await suite.wg.wait();
  });
});
