import { expect, test } from '@playwright/test';
import { SOFIA_CENTRE, expectRealMapTile, tileUrl } from './support/tiles';

test.describe('Tile provider API', () => {
  test('Sofia centre tile returns HTTP 200 with a PNG', async ({ request }) => {
    const response = await request.get(tileUrl(SOFIA_CENTRE));

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('Sofia centre tile contains real map imagery, not the API-key placeholder', async ({
    request,
  }) => {
    const response = await request.get(tileUrl(SOFIA_CENTRE));
    expect(response.ok()).toBe(true);

    expectRealMapTile(await response.body());
  });
});
