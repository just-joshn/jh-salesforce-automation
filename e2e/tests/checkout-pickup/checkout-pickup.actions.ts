// Pickup checkout is built from existing steps: pick a store on the product page (from
// cart-pickup) plus the shared guest checkout steps (from checkout-delivery).
export {
  openProduct,
  selectVariation,
  selectSize,
  openStoreSelection,
  searchStore,
  selectFirstStore,
  closeStoreModal,
  addToCart,
} from '../cart-pickup/cart-pickup.actions';
export {
  openCheckout,
  fillContact,
  fillShippingAddressIfPresent,
  fillPayment,
  placeOrder,
} from '../checkout-delivery/checkout-delivery.actions';
