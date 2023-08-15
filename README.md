# nestjs-gcp-pubsub

<p align="center">
  <a href="https://www.npmjs.com/package/nestjs-gcp-pubsub">
    <img alt="npm" src="https://img.shields.io/npm/v/nestjs-gcp-pubsub" />
  </a>
  <a href="https://www.npmjs.com/package/nestjs-gcp-pubsub">
    <img alt="npm" src="https://img.shields.io/npm/dm/nestjs-gcp-pubsub?style=flat-square" />
  </a>
  <a href="https://github.com/iamolegga/nestjs-gcp-pubsub/actions">
    <img alt="GitHub branch checks state" src="https://badgen.net/github/checks/iamolegga/nestjs-gcp-pubsub">
  </a>
  <a href="https://codeclimate.com/github/iamolegga/nestjs-gcp-pubsub/test_coverage">
    <img src="https://api.codeclimate.com/v1/badges/28ec1572289cf56bc6fd/test_coverage" />
  </a>
  <a href="https://snyk.io/test/github/iamolegga/nestjs-gcp-pubsub">
    <img alt="Known Vulnerabilities" src="https://snyk.io/test/github/iamolegga/nestjs-gcp-pubsub/badge.svg" />
  </a>
  <a href="https://libraries.io/npm/nestjs-gcp-pubsub">
    <img alt="Libraries.io" src="https://img.shields.io/librariesio/release/npm/nestjs-gcp-pubsub">
  </a>
  <img alt="Dependabot" src="https://badgen.net/github/dependabot/iamolegga/nestjs-gcp-pubsub">
</p>

The most basic and unopinionated implementation of [GCP PubSub](https://cloud.google.com/pubsub/) transport for NestJS microservices.

The publisher should not care who will handle the event and by which pattern, it only knows the topic. So, no hardcoded patterns in PubSub messages: on publishing events pass the `topic-name` as a pattern, and on subscription pass `topic-name/subscription-name` string as a pattern.

`ack()` is called automatically when no errors are thrown while handling, otherwise `nack()` is called.

No topics and subscriptions are created automatically. Because we care about [security](https://cloud.google.com/pubsub/docs/authentication).

---

<p align="center"><b>No request-response messaging support and it won't be added, as it's better to use appropriate RPC transports</b></p>

---

## install

```sh
npm i nestjs-gcp-pubsub @google-cloud/pubsub
```

## configure

### setup server:

```ts
import { GCPPubSubStrategy } from 'nestjs-gcp-pubsub';

NestFactory.createMicroservice(
  AppModule,
  {
    strategy: new GCPPubSubStrategy({
      // Props of { ClientConfig } from '@google-cloud/pubsub'
      projectId: 'my-project-id',

      // Optional deserializer, please see
      // implementation in the sources.
      // Default deserializer converts message's
      // data (Buffer type) to string and
      // parse it as JSON
      deserializer: new MyDeserializer();

      // Optional map of subscription options
      // by <topic-name/subscription-name> pattern
      subscriptionOpts: {
        'my-topic/my-subscription': {
          // Props of { SubscriptionOptions }
          // from '@google-cloud/pubsub'
          batching: { maxMessages: 10 },
        }
      };
    });
  },
)
```

### setup client:

```ts
import { ClientsModule } from '@nestjs/microservices';
import { GCPPubSubClient, GCPPubSubClientOptions } from 'nestjs-gcp-pubsub';

export const clientToken = Symbol();

@Module({
  imports: [
    ClientsModule.register([
      {
        name: clientToken,
        customClass: GCPPubSubClient,
        options: <GCPPubSubClientOptions>{
          // Optional serializer, please see
          // implementation in the sources.
          // Default serializer converts emitted
          // data to a JSON-string and pass it
          // as a Buffer to outgoing Message's
          // data field.
          serializer: new MySerializer(),

          // Optional map of topic options by
          // topic-name
          topicOpts: {
            'my-topic': {
              // Props of { PublishOptions }
              // from '@google-cloud/pubsub'
              messageOrdering: true,
            }
          },
        },
      },
    ]),
  ],
})
class AppModule {}
```

## usage

```ts
import { ClientProxy, EventPattern } from '@nestjs/microservices';
import { GCPPubSubContext } from 'nestjs-gcp-pubsub';

@Controller()
class TestController {
  constructor(
    // token that passed to ClientsModule.register
    @Inject(clientToken)
    private readonly client: ClientProxy
  ) {}

  // to get only payload you don't need decorators
  @EventPattern('my-topic/my-subscription')
  handle(payload: MyType) {
    //
  }

  // with context you have to use decorators
  @EventPattern('my-topic/my-subscription-two')
  handle(
    @Payload() payload: MyType,
    @Ctx() ctx: GCPPubSubContext
  ) {
    // 
  }

  async emit() {
    await this.client.emit('my-topic', data as MyType).toPromise();
  }
}
```

<h2 align="center">Do you use this library?<br/>Don't be shy to give it a star! ★</h2>

<h3 align="center">Also if you are into NestJS you might be interested in one of my <a href="https://github.com/iamolegga#nestjs">other NestJS libs</a>.</h3>
