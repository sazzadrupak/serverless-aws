import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';

import * as when from '../steps/when.mjs';

describe('When we invoke the GET / endpoint', () => {
  it('Should return the index page with 8 restaurants', async () => {
    const res = await when.we_invoke_get_index();

    expect(res.statusCode).toEqual(200);
    expect(res.headers['Content-Type']).toEqual('text/html; charset=UTF-8');
    expect(res.body).toBeDefined();

    const $ = load(res.body);
    const restaurants = $('.restaurant', '#restaurantsUl');
    expect(restaurants.length).toEqual(8);
  });
});
