const APP_ROOT = '../../';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsClient } from 'aws4fetch';
import _ from 'lodash';

const mode = process.env.TEST_MODE;

const viaHttp = async (relPath, method, opts) => {
  const url = `${process.env.rest_api_url}/${relPath}`;
  console.info(`invoking via HTTP ${method} ${url}`);

  const body = _.get(opts, 'body', null);
  const headers = {};

  const authHeader = _.get(opts, 'auth');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  let res;
  if (_.get(opts, 'iam_auth', false) === true) {
    const credentialProvider = fromNodeProviderChain();
    const credentials = await credentialProvider();
    const awsClient = new AwsClient({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    res = await awsClient.fetch(url, {
      method,
      headers,
      body: body,
    });
  } else {
    res = await fetch(url, {
      method,
      headers,
      body: body,
    });
  }

  const respHeaders = {};
  for (const [key, value] of res.headers.entries()) {
    respHeaders[key] = value;
  }

  const respBody =
    respHeaders['content-type'] === 'application/json'
      ? await res.json()
      : await res.text();

  return {
    statusCode: res.status,
    headers: respHeaders,
    body: respBody,
  };
};

const viaHandler = async (event, functionName) => {
  const { handler } = await import(`${APP_ROOT}/functions/${functionName}.mjs`);

  const context = {};
  const response = await handler(event, context);
  const contentType = _.get(
    response,
    'headers.content-type',
    'application/json'
  );
  if (_.get(response, 'body') && contentType === 'application/json') {
    response.body = JSON.parse(response.body);
  }
  return response;
};

export const we_invoke_get_index = async () => {
  switch (mode) {
    case 'handler':
      return await viaHandler({}, 'get-index');
    case 'http':
      return await viaHttp('', 'GET');
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_get_restaurants = async () => {
  switch (mode) {
    case 'handler':
      return await viaHandler({}, 'get-restaurants');
    case 'http':
      return await viaHttp('restaurants', 'GET', { iam_auth: true });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_search_restaurants = async (theme, user) => {
  const body = JSON.stringify({ theme });

  switch (mode) {
    case 'handler':
      return await viaHandler({ body }, 'search-restaurants');
    case 'http':
      const auth = user.idToken;
      return await viaHttp('restaurants/search', 'POST', {
        body,
        auth,
      });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_place_order = async (user, restaurantName) => {
  const body = JSON.stringify({ restaurantName });

  switch (mode) {
    case 'handler':
      return await viaHandler({ body }, 'place-order');
    case 'http':
      const auth = user.idToken;
      return await viaHttp('orders', 'POST', { body, auth });
    default:
      throw new Error(`unsupported mode: ${mode}`);
  }
};

export const we_invoke_notify_restaurant = async (event) => {
  if (mode === 'handler') {
    await viaHandler(event, 'notify-restaurant');
  } else {
    throw new Error('not supported');
  }
};
