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
  protected app!: INestMicroservice;
  protected pubSub = new PubSub(this.connectionOpts);
  protected wg = new WaitGroup();

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

    // hack for different nestjs version
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if ('listenAsync' in this.app) await this.app.listenAsync();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    else await this.app.listen();
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
