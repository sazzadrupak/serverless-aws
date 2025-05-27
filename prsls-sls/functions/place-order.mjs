import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import middy from '@middy/core'; // stylish Node.js middleware engine for AWS Lambda
import { Chance } from 'chance';

const logger = new Logger({ serviceName: process.env.serviceName });
const eventBridge = new EventBridgeClient();
const chance = Chance();

const busName = process.env.bus_name;

export const handler = middy(async (event) => {
  logger.refreshSampleRateCalculation();

  const restaurantName = JSON.parse(event.body).restaurantName;

  const orderId = chance.guid();
  logger.debug('placing order...', { orderId, restaurantName });

  const putEvent = new PutEventsCommand({
    Entries: [
      {
        Source: 'big-mouth',
        DetailType: 'order_placed',
        Detail: JSON.stringify({
          orderId,
          restaurantName,
        }),
        EventBusName: busName,
        Time: new Date(),
      },
    ],
  });
  await eventBridge.send(putEvent);
  logger.debug(`published event into EventBridge`, {
    eventType: 'order_placed',
    busName,
  });

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      orderId,
      restaurantName,
    }),
  };
  return response;
}).use(injectLambdaContext(logger));
