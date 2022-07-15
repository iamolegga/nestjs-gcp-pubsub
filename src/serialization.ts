import { Message } from '@google-cloud/pubsub';
import {
  ConsumerDeserializer,
  ProducerSerializer,
  IncomingEvent,
  OutgoingEvent,
} from '@nestjs/microservices';

export class JSONDeserializer implements ConsumerDeserializer {
  deserialize(value: Message, opts: { pattern: string }): IncomingEvent {
    return {
      data: JSON.parse(value.data.toString()),
      pattern: opts.pattern,
    };
  }
}

export class JSONSerializer implements ProducerSerializer {
  serialize(value: OutgoingEvent) {
    return Buffer.from(JSON.stringify(value.data));
  }
}
