import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import middy from '@middy/core';
import ssm from '@middy/ssm';

const logger = new Logger({ serviceName: process.env.serviceName });
const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const { serviceName, ssmStage } = process.env;
const tableName = process.env.restaurants_table;

const findRestaurantsByTheme = async (theme, count) => {
  logger.debug('getting restaurants from DynamoDB with theme...', {
    count,
    tableName,
    theme,
  });

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
      FilterExpression: 'contains(themes, :theme)',
      ExpressionAttributeValues: { ':theme': theme },
    })
  );
  logger.debug('found restaurants', {
    count: resp.Items.length,
  });
  return resp.Items;
};

export const handler = middy(async (event, context) => {
  logger.debug('Secure string', {
    secretString: context.secretString,
  });
  const req = JSON.parse(event.body);
  const theme = req.theme;
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.config.defaultResults
  );
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };

  return response;
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 mins
    setToContext: true,
    fetchData: {
      config: `/${serviceName}/${ssmStage}/search-restaurants/config`,
      secretString: `/${serviceName}/${ssmStage}/search-restaurants/secretString`,
    },
  })
);
