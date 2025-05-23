import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as given from '../steps/given.mjs';
import * as teardown from '../steps/teardown.mjs';
import * as when from '../steps/when.mjs';

const mockSend = vi.fn();
EventBridgeClient.prototype.send = mockSend;

describe('Given an authenticated user', () => {
  let user;

  beforeAll(async () => {
    user = await given.an_authenticated_user();
  });

  afterAll(async () => {
    await teardown.an_authenticated_user(user);
  });

  describe('When we invoke the POST /orders endpojnt', () => {
    let resp;

    beforeAll(async () => {
      mockSend.mockClear();
      mockSend.mockReturnValue({});

      resp = await when.we_invoke_place_order(user, 'Fangtasia');
    });

    it('Should return 200', async () => {
      expect(resp.statusCode).toEqual(200);
    });

    if (process.env.TEST_MODE === 'handler') {
      it(`Should publish a message to EventBridge bus`, async () => {
        expect(mockSend).toHaveBeenCalledTimes(1);
        const [putEventsCmd] = mockSend.mock.calls[0];
        expect(putEventsCmd.input).toEqual({
          Entries: [
            expect.objectContaining({
              Source: 'big-mouth',
              DetailType: 'order_placed',
              Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
              EventBusName: process.env.bus_name,
            }),
          ],
        });
      });
    }
  });
});
