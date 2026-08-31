import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
  EventPattern,
} from '@nestjs/microservices';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base, useSuite } from './base-suite';

class Mono extends Base {
  protected patterns: string[] = ['topic-mono/subscription-mono'];

  ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const wg = this.wg;
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      @EventPattern('topic-mono/subscription-mono')
      handle(event: unknown) {
        expect(event).toBe(data);
        wg.done();
      }

      async emit() {
        wg.add(1);
        await this.client.emit('topic-mono', data).toPromise();
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

describe('Mono', () => {
  const getSuite = useSuite(() => new Mono());

  it('should send and receive same data', async () => {
    const suite = getSuite();

    await suite.app.get(suite.ctrl).emit();
    await suite.wg.wait();
  });
});
