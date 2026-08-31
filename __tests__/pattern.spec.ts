import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
} from '@nestjs/microservices';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base, useSuite } from './base-suite';

class Pattern extends Base {
  protected patterns: string[] = ['topic-pattern/subscription-pattern'];

  ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}

      async emit() {
        await this.client.emit({ pattern: 'topic-pattern' }, data).toPromise();
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

describe('Pattern', () => {
  const getSuite = useSuite(() => new Pattern());

  it('pattern should be only string', async () => {
    const suite = getSuite();

    await expect(suite.app.get(suite.ctrl).emit()).rejects.toBeTruthy();
  });
});
