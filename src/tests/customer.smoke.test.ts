import Shop from '@/src/app/(app)/customer/shop';
import Checkout from '@/src/app/(app)/customer/checkout';
import MyTrips from '@/src/app/(app)/customer/my-trips';
import Store from '@/src/app/(app)/customer/store/[id]';

describe('customer screens (smoke)', () => {
  it('imports without crashing', () => {
    expect(Shop).toBeTruthy();
    expect(Checkout).toBeTruthy();
    expect(MyTrips).toBeTruthy();
    expect(Store).toBeTruthy();
  });
});
