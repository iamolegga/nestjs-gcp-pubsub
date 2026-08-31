import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
  EventPattern,
} from '@nestjs/microservices';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base, useSuite } from './base-suite';

class HandleError extends Base {
  protected patterns: string[] = [
    'topic-handle-error/subscription-handle-error',
  ];

  ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const wg = this.wg;
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      private attempt = 0;
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      @EventPattern('topic-handle-error/subscription-handle-error')
      handle(event: unknown) {
        if (this.attempt === 0) {
          this.attempt++;
          throw new Error('retry');
        }
        expect(event).toBe(data);
        wg.done();
      }

      async emit() {
        wg.add(1);
        await this.client.emit('topic-handle-error', data).toPromise();
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

describe('HandleError', () => {
  const getSuite = useSuite(() => new HandleError());

  it('should throw error and retry again same message', async () => {
    const suite = getSuite();

    await suite.app.get(suite.ctrl).emit();
    await suite.wg.wait();
  });
});
