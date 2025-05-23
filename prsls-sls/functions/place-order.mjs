import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { Chance } from 'chance';

const eventBridge = new EventBridgeClient();
const chance = Chance();

const busName = process.env.bus_name;

export const handler = async (event) => {
  const restaurantName = JSON.parse(event.body).restaurantName;

  const orderId = chance.guid();
  console.log(`placing order Id [${orderId}] to [${restaurantName}]...`);

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
  console.log(`published 'order_placed' event into EventBridge...`);

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      orderId,
      restaurantName,
    }),
  };
  return response;
};
