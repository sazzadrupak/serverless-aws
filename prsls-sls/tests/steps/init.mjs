import { config } from 'dotenv';

export default function setup() {
  process.env.AWS_REGION = 'us-east-1';
  config();
}
