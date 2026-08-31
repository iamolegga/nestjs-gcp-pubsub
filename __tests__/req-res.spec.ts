import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
} from '@nestjs/microservices';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base, useSuite } from './base-suite';

class ReqRes extends Base {
  protected patterns: string[] = ['topic-req-res/subscription-req-res'];

  ctrl!: Type<{ emit(): Promise<void> }>;

  get metadata(): ModuleMetadata {
    const token = Symbol();
    const data = Math.random().toString();

    @Controller()
    class TestController {
      constructor(@Inject(token) private readonly client: ClientProxy) {}
      async emit() {
        await this.client.send('topic-req-res', data).toPromise();
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

describe('ReqRes', () => {
  const getSuite = useSuite(() => new ReqRes());

  it('send should throw', async () => {
    const suite = getSuite();

    await expect(suite.app.get(suite.ctrl).emit()).rejects.toBeTruthy();
  });
});
