import {
  ClientConfig,
  SubscriptionOptions,
  PublishOptions,
  Message,
} from '@google-cloud/pubsub';
import {
  Deserializer,
  IncomingEvent,
  OutgoingEvent,
  Serializer,
} from '@nestjs/microservices';

export interface GCPPubSubServerOptions extends ClientConfig {
  subscriptionOpts?: Record<string, SubscriptionOptions>;
  deserializer?: Deserializer<Message, IncomingEvent>;
}

export interface GCPPubSubClientOptions extends ClientConfig {
  topicOpts?: Record<string, PublishOptions>;
  serializer?: Serializer<OutgoingEvent, Buffer>;
}
