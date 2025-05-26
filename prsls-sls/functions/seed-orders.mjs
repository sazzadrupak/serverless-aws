import {
  IdempotencyConfig,
  makeIdempotent,
} from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IdempotencyTableName,
});

const _handler = async (event) => {
  const order = event.detail;

  console.log('Saving order ID:', order.orderId);

  await dynamodb.send(
    new PutCommand({
      TableName: process.env.orders_table,
      Item: {
        id: order.orderId,
        restaurantName: order.restaurantName,
      },
    })
  );
};

export const handler = makeIdempotent(_handler, {
  persistenceStore,
  config: new IdempotencyConfig({
    eventKeyJmesPath: 'detail.orderId',
  }),
});
