import { Controller, Inject, ModuleMetadata, Type } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  CustomTransportStrategy,
  EventPattern,
} from '@nestjs/microservices';
import { suite, test } from '@testdeck/jest';

import { GCPPubSubClient, GCPPubSubStrategy } from '../src';

import { Base } from './base-suite';

@suite
export class Mono extends Base {
  protected patterns: string[] = ['topic-mono/subscription-mono'];

  private ctrl!: Type<{ emit(): Promise<void> }>;

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

  @test
  async 'should send and receive same data'() {
    await this.app.get(this.ctrl).emit();
    await this.wg.wait();
  }

  async after() {
    await this.app.close();
  }
}
