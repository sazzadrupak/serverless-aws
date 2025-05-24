import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

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
  console.log(`notified restaurant [${restaurantName}] of order [${orderId}]`);

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

  console.log(`published 'restaurant_notified' event to EventBridge`);
  return orderId;
};

export const handler = makeIdempotent(_handler, { persistenceStore });
