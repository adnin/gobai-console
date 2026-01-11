// src/features/orders/orderUi.ts
export type UiStage =
  | 'checking_drivers'
  | 'no_riders'
  | 'assigning_rider'
  | 'waiting_store_confirm'
  | 'waiting_quote'
  | 'quote_ready'
  | 'waiting_payment'
  | 'preparing'
  | 'rider_on_the_way'
  | 'picked_up'
  | 'near_you'
  | 'delivered'
  | 'completed'
  | 'cancelled';

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

function isCancelled(status: string) {
  return status === 'cancelled' || status === 'canceled';
}

function isSystemNoDriverCancel(order: any, status: string) {
  if (!isCancelled(status)) return false;
  const cancelledBy = norm(order?.cancelled_by);
  const reason = norm(order?.cancel_reason);

  const bySystem = cancelledBy === 'system' || cancelledBy === 'auto' || cancelledBy === 'platform';
  const noDriver =
    reason === 'no_drivers_available' ||
    reason === 'no_available_driver' ||
    reason === 'no_driver_available' ||
    reason === 'no_rider_available' ||
    reason === 'no_riders_available' ||
    reason === 'dispatch_exhausted' ||
    reason === 'exhausted' ||
    reason === 'no_riders' ||
    reason === 'no_drivers';

  return bySystem && noDriver;
}

function isPaidEnough(paymentStatus: string) {
  // Keep permissive: backend is the source of truth; UI only needs a calm state.
  return [
    'verified',
    'paid',
    'captured',
    'authorized',
    'success',
    'completed',
  ].includes(paymentStatus);
}

export function mapOrderToUiStage(order: any): UiStage {
  const status = norm(order?.status);
  const storeStatus = norm(order?.store_status);
  const paymentStatus = norm(order?.payment_status);
  const paymentMethod = norm(order?.payment_method);
  const dispatchStatus = norm(order?.dispatch_status);
  const hasStore = !!order?.store_id;
  const hasDriver = !!order?.driver_id;

  const isCod = paymentMethod === 'cash' || paymentMethod === 'cod';

  // Internal dispatch outcome surfaced calmly
  if (!hasDriver && (dispatchStatus === 'exhausted' || dispatchStatus.includes('exhaust'))) {
    // If it was truly cancelled, cancelled copy wins
    if (!isCancelled(status)) {
      return 'no_riders';
    }
  }

  // hard terminal
  if (isCancelled(status)) {
    return 'cancelled';
  }
  if (status === 'completed') {
    return 'completed';
  }

  // delivery lifecycle (keep mental model clean)
  if (status === 'delivered') {
    return 'delivered';
  }
  if (status === 'in_transit') {
    // optionally compute near_you if you have driver distance; else keep in_transit as picked_up
    return order?.near_you ? 'near_you' : 'picked_up';
  }
  if (status === 'picked_up') {
    return 'picked_up';
  }
  if (status === 'arrived' || status === 'accepted') {
    return 'rider_on_the_way';
  }

  // STORE FLOW: store-first acceptance BEFORE payment UI
  if (hasStore) {
    const requiresQuote = !!order?.requires_quote_confirmation || !!norm(order?.request_kind);
    const quoteStatus = norm(order?.quote_status);

    // ✅ Paper/pharmacy: store must prepare quote; customer must confirm + pay (wallet) before dispatch
    if (requiresQuote) {
      if (quoteStatus === 'pending') {
        return 'waiting_quote';
      }
      if (quoteStatus === 'ready' && !isPaidEnough(paymentStatus)) {
        return 'quote_ready';
      }
    }
    // still waiting store to confirm availability / accept
    if (!storeStatus || storeStatus === 'new') {
      return 'waiting_store_confirm';
    }

    // store confirmed; if you track prep time you can show "Preparing"
    if (storeStatus === 'preparing') {
      return 'preparing';
    }
    if (storeStatus === 'ready') {
      // if payment required but not ready yet, show payment window
      if (!isCod && !isPaidEnough(paymentStatus)) {
        return 'waiting_payment';
      }
      // paid + ready => dispatch / assigning rider
      return hasDriver ? 'assigning_rider' : 'assigning_rider';
    }

    // accepted but not yet preparing -> payment allowed, but reassure
    if (storeStatus === 'accepted') {
      if (!isCod && !isPaidEnough(paymentStatus)) {
        return 'waiting_payment';
      }
      return hasDriver ? 'assigning_rider' : 'assigning_rider';
    }
  }

  // PARCEL / TRANSPORT: booking -> assigning rider
  if (status === 'pending_payment') {
    return hasDriver ? 'assigning_rider' : 'assigning_rider';
  }
  if (status === 'pending') {
    return hasDriver ? 'assigning_rider' : 'checking_drivers';
  }

  return 'assigning_rider';
}

export function uiCopy(stage: UiStage, order?: any) {
  const status = norm(order?.status);
  const systemNoDriver = isSystemNoDriverCancel(order, status);

  switch (stage) {
    case 'checking_drivers':
      return {
        subtitle: 'We’ll assign the best nearby rider (usually 1–2 minutes).',
        title: 'Checking rider availability…',
      };
    case 'no_riders':
      return {
        subtitle: 'Try again, or adjust pickup/dropoff.',
        title: 'No riders available right now',
      };
    case 'assigning_rider':
      return {
        subtitle: 'We’ll match you with the best nearby rider.',
        title: 'Assigning your rider…',
      };
    case 'waiting_store_confirm':
      return {
        subtitle: 'Payment only proceeds after the store confirms your order.',
        title: 'Waiting for store confirmation…',
      };

    case 'waiting_quote':
      return {
        subtitle: 'A pharmacist/store staff will review your request and prepare a quote.',
        title: 'Reviewing your request…',
      };
    case 'quote_ready':
      return {
        subtitle: 'Please confirm the quote and pay by wallet to dispatch.',
        title: 'Quote ready',
      };
    case 'waiting_payment':
      return {
        subtitle: 'Payment only proceeds after the store confirms.',
        title: 'Payment window is open',
      };
    case 'preparing':
      return {
        subtitle: 'The store is preparing your order.',
        title: 'Preparing',
      };
    case 'rider_on_the_way':
      return {
        subtitle: 'Your fare & ETA are locked.',
        title: 'Rider on the way',
      };
    case 'picked_up':
      return { subtitle: 'Rider is heading to you.', title: 'Picked up' };
    case 'near_you':
      return {
        subtitle: 'Please be ready to receive your order.',
        title: 'Near you',
      };
    case 'delivered':
      return { subtitle: 'Please confirm when received.', title: 'Delivered' };
    case 'completed':
      return { subtitle: 'Thanks for using GOBAI.', title: 'Completed' };
    case 'cancelled':
      if (systemNoDriver) {
        return {
          title: "Couldn’t match a rider this time",
          subtitle: 'No penalty. You can try again anytime.',
        };
      }
      return {
        title: 'Booking cancelled',
        subtitle: 'No penalty. You can book again anytime.',
      };
  }
}

export function isSystemNoDriverCancelForUi(order?: any) {
  const status = norm(order?.status);
  return isSystemNoDriverCancel(order, status);
}
