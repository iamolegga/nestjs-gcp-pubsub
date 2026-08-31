import { PubSub } from '@google-cloud/pubsub';
import { INestMicroservice, Module, ModuleMetadata } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  CustomTransportStrategy,
  MicroserviceOptions,
} from '@nestjs/microservices';

import { invariant } from '../src/invariant';

import { WaitGroup } from './utils/wait-group';

export abstract class Base {
  protected abstract metadata: ModuleMetadata;
  protected abstract strategy: CustomTransportStrategy;
  protected abstract patterns: string[];

  protected connectionOpts = {
    projectId: 'test',
    apiEndpoint: process.env.PUBSUB_EMULATOR_HOST,
  };
  app!: INestMicroservice;
  protected pubSub = new PubSub(this.connectionOpts);
  wg = new WaitGroup();

  async before() {
    for (const pattern of this.patterns) {
      const [topicName, subscriptionName, ...rest] = pattern.split('/');
      invariant(
        topicName && subscriptionName && rest.length === 0,
        'invalid pattern',
      );
      const topic = this.pubSub.topic(topicName);
      let [exists] = await topic.exists();
      if (!exists) await topic.create();
      const subscription = topic.subscription(subscriptionName);
      [exists] = await subscription.exists();
      if (!exists) {
        await subscription.create();
      } else {
        await subscription.seek(new Date());
      }
    }

    @Module(this.metadata)
    class AppModule {}

    this.app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      { strategy: this.strategy },
    );

    await this.app.listen();
  }

  async after() {
    await this.app.close();

    for (const pattern of this.patterns) {
      const [topicName, subscriptionName, ...rest] = pattern.split('/');
      invariant(
        topicName && subscriptionName && rest.length === 0,
        'invalid pattern',
      );
      const topic = this.pubSub.topic(topicName);
      const [exists] = await topic.exists();
      if (exists) await topic.delete();
    }

    await this.pubSub.close();
  }
}

/**
 * Wires a `Base` subclass into vitest's lifecycle the way the `@testdeck`
 * `@suite` decorator used to: a fresh instance per test, `before` as
 * `beforeEach` and `after` as `afterEach`.
 */
export function useSuite<T extends Base>(factory: () => T): () => T {
  let instance: T;

  beforeEach(async () => {
    instance = factory();
    await instance.before();
  });

  afterEach(async () => {
    await instance.after();
  });

  return () => instance;
}
