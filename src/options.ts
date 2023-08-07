import {
  ClientConfig,
  SubscriptionOptions,
  PublishOptions,
  Message,
} from '@google-cloud/pubsub';
import { Logger } from '@nestjs/common';
import {
  Deserializer,
  IncomingEvent,
  OutgoingEvent,
  Serializer,
} from '@nestjs/microservices';

export interface GCPPubSubServerOptions extends ClientConfig {
  subscriptionOpts?: Record<string, SubscriptionOptions>;
  deserializer?: Deserializer<Message, IncomingEvent>;
  logger?: Logger;
}

export interface GCPPubSubClientOptions extends ClientConfig {
  topicOpts?: Record<string, PublishOptions>;
  serializer?: Serializer<OutgoingEvent, Buffer>;
}
