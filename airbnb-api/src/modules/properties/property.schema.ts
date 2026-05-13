import { z } from 'zod';
import { PropertyType } from '@prisma/client';

// ─── Create Property Schema ───────────────────────────────────────────────────
export const createPropertySchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  type: z.nativeEnum(PropertyType, {
    message: 'Invalid property type',
  }),
  pricePerNight: z
    .number({ error: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(100000, 'Price cannot exceed 100,000'),
  cleaningFee: z
    .number()
    .min(0, 'Cleaning fee cannot be negative')
    .max(10000)
    .default(0),
  maxGuests: z
    .number()
    .int('Max guests must be a whole number')
    .min(1, 'Must allow at least 1 guest')
    .max(50, 'Cannot exceed 50 guests'),
  bedrooms: z
    .number()
    .int()
    .min(0, 'Bedrooms cannot be negative')
    .max(50),
  bathrooms: z
    .number()
    .int()
    .min(1, 'Must have at least 1 bathroom')
    .max(50),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  latitude: z
    .number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  amenities: z
    .array(z.string().min(1))
    .max(30, 'Cannot exceed 30 amenities')
    .default([]),
});

// ─── Update Property Schema ───────────────────────────────────────────────────
export const updatePropertySchema = createPropertySchema.partial();

// ─── Query Schema ─────────────────────────────────────────────────────────────
// ALL numeric query params use z.coerce.number() — URL params are always strings
// z.coerce.number() safely converts "2" → 2, and rejects "abc" with a proper error
// Never use Number(val) directly — it returns NaN silently for invalid input
export const propertyQuerySchema = z.object({

  // Pagination — coerce from string to number
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),

  // Location filters
  city: z.string().optional(),
  country: z.string().optional(),

  // Price range — coerce from string to number
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),

  // Guest filter — coerce from string to int
  // "2" → 2, so Prisma gets Int not String
  maxGuests: z.coerce.number().int().positive().optional(),

  // Bedroom/bathroom filters — coerce from string to int
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(1).optional(),

  // Property type enum
  propertyType: z.nativeEnum(PropertyType).optional(),

  // Date filters — coerce from string to Date
  // new Date("2026-05-11") is valid — Zod coerce handles this correctly
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),

  // Amenities — comma-separated string → array
  amenities: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((a) => a.trim()) : undefined)),

  // Sorting
  sortBy: z
    .enum(['pricePerNight', 'createdAt', 'maxGuests'])
    .optional()
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),

}).refine(
  (data) => {
    // Both checkIn and checkOut must be provided together
    if (data.checkIn && !data.checkOut) return false;
    if (data.checkOut && !data.checkIn) return false;
    return true;
  },
  { message: 'Both checkIn and checkOut are required for availability search' }
).refine(
  (data) => {
    // checkOut must be after checkIn
    if (data.checkIn && data.checkOut) {
      return data.checkOut > data.checkIn;
    }
    return true;
  },
  { message: 'checkOut must be after checkIn' }
);

// ─── Params Schema ────────────────────────────────────────────────────────────
export const propertyParamsSchema = z.object({
  id: z.string().min(1, 'Property ID is required'),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyQuery = z.infer<typeof propertyQuerySchema>;
export type PropertyParams = z.infer<typeof propertyParamsSchema>;