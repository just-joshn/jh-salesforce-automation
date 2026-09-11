import { z } from 'zod';
import { loose } from './primitives';
const suggestionProductSchema = loose({ productName: z.string().optional(), productId: z.string().optional() });
export const searchSuggestionSchema = loose({ productSuggestions: loose({ products: z.array(suggestionProductSchema).optional() }).optional(), categorySuggestions: loose({ categories: z.array(loose({ name: z.string().optional() })).optional() }).optional() });
const searchHitSchema = loose({ productId: z.string().optional(), productName: z.string().optional(), currency: z.string().optional() });
export const productSearchSchema = loose({ total: z.number(), hits: z.array(searchHitSchema).optional() });
const pickupStoreSchema = loose({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  address1: z.string().min(1),
  city: z.string().min(1),
  stateCode: z.string().min(1),
  postalCode: z.string().min(1),
  distance: z.number().optional(),
});
export const storeSearchResponseSchema = loose({ data: z.array(pickupStoreSchema) });
export const productSchema = loose({ id: z.string().min(1), currency: z.string().optional(), name: z.string().optional() });
export const categorySchema = loose({ id: z.string().min(1), name: z.string().min(1) });
