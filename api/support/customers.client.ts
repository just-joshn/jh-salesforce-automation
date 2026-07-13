import { expect, type APIResponse } from '@playwright/test';
import { withSite } from './env';
import { ScapiClient } from './scapi-client';
import type {
  Customer,
  CustomerAddress,
  CustomerOrderResult,
  CustomerProductList,
  CustomerProductListItem,
} from './scapi-types';
import { parseJson } from './response';
import {
  customerAddressSchema,
  customerOrdersResponseSchema,
  customerProductListItemSchema,
  customerProductListSchema,
  customerProductListsResponseSchema,
  customerSchema,
} from './schemas';

const FAMILY = 'customer/shopper-customers/v1';

/** The Shopper Customers family: registration, profile, address book, wishlist. */
export class CustomersClient extends ScapiClient {
  private url(path: string): string {
    return this.apiUrl(FAMILY, path);
  }

  /** B1: creates a registered customer, exactly as the registration form submits it. */
  async register(accessToken: string, details: RegistrationDetails): Promise<APIResponse> {
    return this.request.post(this.url('customers'), {
      headers: { ...this.authed(accessToken), 'Content-Type': 'application/json' },
      params: withSite(),
      data: {
        customer: {
          email: details.email,
          login: details.email,
          firstName: details.firstName,
          lastName: details.lastName,
        },
        password: details.password,
      },
    });
  }

  async getCustomer(accessToken: string, customerId: string): Promise<Customer> {
    const response = await this.request.get(this.url(`customers/${customerId}`), {
      headers: this.authed(accessToken),
      params: withSite(),
    });
    expect(response.status()).toBe(200);
    return parseJson<Customer>(response, customerSchema, 'get customer');
  }

  /** B7: updates profile details (phone) via PATCH, as the account profile editor does. */
  async updatePhone(accessToken: string, customerId: string, phone: string): Promise<Customer> {
    const response = await this.request.patch(this.url(`customers/${customerId}`), {
      headers: { ...this.authed(accessToken), 'Content-Type': 'application/json' },
      params: withSite(),
      data: { phoneHome: phone },
    });
    expect(response.status()).toBe(200);
    return parseJson<Customer>(response, customerSchema, 'update customer phone');
  }

  /** B6: changes the signed-in shopper's password. 204 on success. */
  async changePassword(
    accessToken: string,
    customerId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<APIResponse> {
    const response = await this.request.put(this.url(`customers/${customerId}/password`), {
      headers: { ...this.authed(accessToken), 'Content-Type': 'application/json' },
      params: withSite(),
      data: { currentPassword, password: newPassword },
    });
    expect(response.status(), 'change password').toBe(204);
    return response;
  }

  /** B8: saves an address to the address book, optionally as the default. */
  async addAddress(
    accessToken: string,
    customerId: string,
    address: AddressBookEntry,
    preferred = false,
  ): Promise<CustomerAddress> {
    const response = await this.request.post(this.url(`customers/${customerId}/addresses`), {
      headers: { ...this.authed(accessToken), 'Content-Type': 'application/json' },
      params: withSite(),
      data: {
        addressId: address.addressId,
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone,
        address1: address.address1,
        city: address.city,
        stateCode: address.stateCode,
        postalCode: address.postalCode,
        countryCode: 'US',
        preferred,
      },
    });
    expect(response.status()).toBe(200);
    return parseJson<CustomerAddress>(response, customerAddressSchema, 'add address');
  }

  /** B8: removes a saved address by the id the add returned. 204 on success. */
  async removeAddress(
    accessToken: string,
    customerId: string,
    addressId: string,
  ): Promise<APIResponse> {
    const response = await this.request.delete(
      this.url(`customers/${customerId}/addresses/${addressId}`),
      {
        headers: this.authed(accessToken),
        params: withSite(),
      },
    );
    expect(response.status(), 'remove address').toBe(204);
    return response;
  }

  async listAddresses(accessToken: string, customerId: string): Promise<CustomerAddress[]> {
    // The Customers API exposes address collection data on GET /customers/{id}; the
    // /addresses collection path is POST-only and correctly answers 405 to a list call.
    const customer = await this.getCustomer(accessToken, customerId);
    return customer.addresses ?? [];
  }

  /** Test isolation: removes all saved addresses from the worker account. */
  async clearAddresses(accessToken: string, customerId: string): Promise<void> {
    const addresses = await this.listAddresses(accessToken, customerId);
    for (const address of addresses) {
      if (!address.addressId) {
        throw new Error('saved address carries no addressId');
      }
      await this.removeAddress(accessToken, customerId, address.addressId);
    }
  }

  // --- Wishlist (product lists) ---------------------------------------------------

  /**
   * C1: resolves the shopper's wish_list, creating it on first use — the same implicit
   * default-list creation the storefront performs behind "Add to Wishlist".
   */
  async getOrCreateWishlist(accessToken: string, customerId: string): Promise<CustomerProductList> {
    const listsResponse = await this.request.get(
      this.url(`customers/${customerId}/product-lists`),
      { headers: this.authed(accessToken), params: withSite() },
    );
    expect(listsResponse.status()).toBe(200);
    const lists = await parseJson<{ data?: CustomerProductList[] }>(
      listsResponse,
      customerProductListsResponseSchema,
      'list product lists',
    );
    const existing = lists.data?.find((list) => list.type === 'wish_list');
    if (existing) {
      return existing;
    }

    const createResponse = await this.request.post(
      this.url(`customers/${customerId}/product-lists`),
      {
        headers: { ...this.authed(accessToken), 'Content-Type': 'application/json' },
        params: withSite(),
        data: { type: 'wish_list' },
      },
    );
    expect(createResponse.status()).toBe(200);
    return parseJson<CustomerProductList>(
      createResponse,
      customerProductListSchema,
      'create product list',
    );
  }

  async getWishlist(
    accessToken: string,
    customerId: string,
    listId: string,
  ): Promise<CustomerProductList> {
    const response = await this.request.get(
      this.url(`customers/${customerId}/product-lists/${listId}`),
      { headers: this.authed(accessToken), params: withSite() },
    );
    expect(response.status()).toBe(200);
    return parseJson<CustomerProductList>(response, customerProductListSchema, 'get product list');
  }

  /** Test isolation: removes every wishlist item so a test starts from a known-empty list. */
  async clearWishlistItems(accessToken: string, customerId: string): Promise<void> {
    const list = await this.getOrCreateWishlist(accessToken, customerId);
    const listId = list.id;
    if (!listId) {
      throw new Error('wish list carries no id');
    }
    const current = await this.getWishlist(accessToken, customerId, listId);
    for (const item of current.customerProductListItems ?? []) {
      if (item.id) {
        await this.removeWishlistItem(accessToken, customerId, listId, item.id);
      }
    }
  }

  /** C1: adds a product to the wishlist. Duplicate adds return the same item (idempotent). */
  async addWishlistItem(
    accessToken: string,
    customerId: string,
    listId: string,
    productId: string,
  ): Promise<CustomerProductListItem> {
    const response = await this.request.post(
      this.url(`customers/${customerId}/product-lists/${listId}/items`),
      {
        headers: { ...this.authed(accessToken), 'Content-Type': 'application/json' },
        params: withSite(),
        data: { type: 'product', productId, quantity: 1, priority: 1, public: false },
      },
    );
    expect(response.status()).toBe(200);
    return parseJson<CustomerProductListItem>(
      response,
      customerProductListItemSchema,
      'add product-list item',
    );
  }

  /** C2: removes a wishlist item. 204 on success. */
  async removeWishlistItem(
    accessToken: string,
    customerId: string,
    listId: string,
    itemId: string,
  ): Promise<APIResponse> {
    const response = await this.request.delete(
      this.url(`customers/${customerId}/product-lists/${listId}/items/${itemId}`),
      { headers: this.authed(accessToken), params: withSite() },
    );
    expect(response.status(), 'remove product-list item').toBe(204);
    return response;
  }

  /** B9: the order-history list the /account/orders page loads (expand=oms). */
  async listOrders(accessToken: string, customerId: string): Promise<CustomerOrderResult> {
    const response = await this.request.get(this.url(`customers/${customerId}/orders`), {
      headers: this.authed(accessToken),
      params: withSite({ expand: 'oms' }),
    });
    expect(response.status()).toBe(200);
    return parseJson<CustomerOrderResult>(
      response,
      customerOrdersResponseSchema,
      'list customer orders',
    );
  }
}

export interface RegistrationDetails {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AddressBookEntry {
  addressId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
}
