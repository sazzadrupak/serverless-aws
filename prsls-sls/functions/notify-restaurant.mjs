import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { makeHandlerIdempotent } from '@aws-lambda-powertools/idempotency/middleware';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import middy from '@middy/core';

const logger = new Logger({ serviceName: process.env.serviceName });
const tracer = new Tracer({ serviceName: process.env.serviceName });

const eventBridge = new EventBridgeClient();
tracer.captureAWSv3Client(eventBridge);

const sns = new SNSClient();
tracer.captureAWSv3Client(sns);

const busName = process.env.bus_name;
const topicArn = process.env.restaurant_notification_topic;
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.idempotency_table,
});

const _handler = async (event) => {
  logger.refreshSampleRateCalculation();

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

export const handler = middy(_handler)
  .use(injectLambdaContext(logger))
  .use(
    makeHandlerIdempotent({
      persistenceStore,
    })
  )
  .use(captureLambdaHandler(tracer));
