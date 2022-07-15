import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
} from '@nestjs/microservices';
import { suite, test } from '@testdeck/jest';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base } from './base-suite';

@suite
export class Pattern extends Base {
  protected patterns: string[] = ['topic-pattern/subscription-pattern'];

  private ctrl!: Type<{ emit(): Promise<void> }>;

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

  @test
  async 'pattern should be only string'() {
    await expect(this.app.get(this.ctrl).emit()).rejects.toBeTruthy();
  }

  async after() {
    await this.app.close();
  }
}
