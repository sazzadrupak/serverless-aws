import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import middy from '@middy/core';
import { AwsClient } from 'aws4fetch';
import fs from 'fs';
import Mustache from 'mustache';

const logger = new Logger({
  serviceName: process.env.SERVICE_NAME || 'get-index',
});
const restaurantsApiRoot = process.env.restaurants_api;
const ordersApiRoot = process.env.orders_api;
const cognitoUserPoolId = process.env.cognito_user_pool_id;
const cognitoClientId = process.env.cognito_client_id;
const awsRegion = process.env.AWS_REGION;
const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const credentialProvider = fromNodeProviderChain();
const credentials = await credentialProvider();
const aws = new AwsClient({
  accessKeyId: credentials.accessKeyId,
  secretAccessKey: credentials.secretAccessKey,
  sessionToken: credentials.sessionToken,
});

const template = fs.readFileSync('static/index.html', 'utf-8');

const getRestaurants = async () => {
  logger.debug('getting restaurants...', { url: restaurantsApiRoot });

  const resp = await aws.fetch(restaurantsApiRoot);
  if (!resp.ok) {
    throw new Error('Failed to fetch restaurants: ' + resp.statusText);
  }
  return await resp.json();
};

export const handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation();

  const restaurants = await getRestaurants();
  logger.debug('got restaurants', { count: restaurants.length });
  const dayOfWeek = days[new Date().getDay()];
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
    placeOrderUrl: ordersApiRoot,
  };
  const html = Mustache.render(template, view);
  const response = {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
    body: html,
  };

  return response;
}).use(injectLambdaContext(logger));
