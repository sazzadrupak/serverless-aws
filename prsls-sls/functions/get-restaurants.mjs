import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import middy from '@middy/core';
import ssm from '@middy/ssm';

const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const { serviceName, stage } = process.env;
const tableName = process.env.restaurants_table;

const getRestaurants = async (count) => {
  console.log(`fetching ${count} restaurants from ${tableName}...`);

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
    })
  );
  console.log(`found ${resp.Items.length} restaurants`);
  return resp.Items;
};

export const handler = middy(async (event, context) => {
  const restaurants = await getRestaurants(context.config.defaultResults);
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };

  return response;
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 minute
    setToContext: true, // fetches individual parameters and stores them in either the invocation context object or the environment variables. By default, they are stored in the environment variables, but we can use the optional config setToContext to tell the middleware to store them in the context object instead.
    fetchData: {
      config: `/${serviceName}/${stage}/get-restaurants/config`,
    },
  })
);
