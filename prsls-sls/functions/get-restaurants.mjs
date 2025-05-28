import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import middy from '@middy/core'; // stylish Node.js middleware engine for AWS Lambda
import ssm from '@middy/ssm';

const logger = new Logger({ serviceName: process.env.serviceName });
const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const tracer = new Tracer({ serviceName: process.env.serviceName });
tracer.captureAWSv3Client(dynamodb);

const { serviceName, ssmStage } = process.env;
const tableName = process.env.restaurants_table;

const getRestaurants = async (count) => {
  logger.debug('getting restaurants from DynamoDB...', {
    count,
    tableName,
  });

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
    })
  );
  logger.debug('found restaurants', {
    count: resp.Items.length,
  });
  return resp.Items;
};

export const handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation();

  const restaurants = await getRestaurants(context.config.defaultResults);
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };

  return response;
})
  .use(
    ssm({
      cache: true,
      cacheExpiry: 1 * 60 * 1000, // 1 minute
      setToContext: true, // fetches individual parameters and stores them in either the invocation context object or the environment variables. By default, they are stored in the environment variables, but we can use the optional config setToContext to tell the middleware to store them in the context object instead.
      fetchData: {
        config: `/${serviceName}/${ssmStage}/get-restaurants/config`,
      },
    })
  )
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer));
