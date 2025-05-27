import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const logger = new Logger({ serviceName: process.env.serviceName });
const eventBridge = new EventBridgeClient();
const sns = new SNSClient();

const busName = process.env.bus_name;
const topicArn = process.env.restaurant_notification_topic;
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.idempotency_table,
});

const _handler = async (event) => {
  const order = event.detail;
  const publishCmd = new PublishCommand({
    Message: JSON.stringify(order),
    TopicArn: topicArn,
  });
  await sns.send(publishCmd);

  const { restaurantName, orderId } = order;
  logger.debug('notified restaurant', { orderId, restaurantName });

  const putEventsCmd = new PutEventsCommand({
    Entries: [
      {
        Source: 'big-mouth',
        DetailType: 'restaurant_notified',
        Detail: JSON.stringify(order),
        EventBusName: busName,
      },
    ],
  });
  await eventBridge.send(putEventsCmd);

  logger.debug(`published event into EventBridge`, {
    eventType: 'restaurant_notified',
    busName,
  });

  return orderId;
};

export const handler = makeIdempotent(_handler, { persistenceStore });
