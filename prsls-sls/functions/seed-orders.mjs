import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { makeHandlerIdempotent } from '@aws-lambda-powertools/idempotency/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import middy from '@middy/core';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const tracer = new Tracer({ serviceName: process.env.serviceName });
tracer.captureAWSv3Client(dynamodb);

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

export const handler = middy(_handler)
  .use(injectLambdaContext(logger))
  .use(
    makeHandlerIdempotent({
      persistenceStore,
    })
  )
  .use(captureLambdaHandler(tracer));
