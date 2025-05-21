import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsClient } from 'aws4fetch';
import fs from 'fs';
import Mustache from 'mustache';

const restaurantsApiRoot = process.env.restaurants_api;
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

let html;

function loadHtml() {
  if (!html) {
    console.log('loading index.html...');
    html = fs.readFileSync('static/index.html', 'utf-8');
    console.log('loaded');
  }

  return html;
}

const getRestaurants = async () => {
  const resp = await aws.fetch(restaurantsApiRoot);
  if (!resp.ok) {
    console.error(
      `Error fetching restaurants: ${resp.status} ${resp.statusText}`
    );
    throw new Error(
      `Error fetching restaurants: ${resp.status} ${resp.statusText}`
    );
  }
  return await resp.json();
};

export const handler = async (event, context) => {
  const template = loadHtml();
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const html = Mustache.render(template, { dayOfWeek, restaurants });
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
    body: html,
  };

  return response;
};
