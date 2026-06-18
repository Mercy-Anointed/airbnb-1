// ─── Auth API Client ──────────────────────────────────────────────────────────
// All auth requests go through here — typed, consistent, centralized
// Access token stored in memory (not localStorage — XSS safe)
// Refresh token lives in httpOnly cookie — handled automatically by browser

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── In-memory token store ────────────────────────────────────────────────────
// Never store access token in localStorage — XSS vulnerable
// Memory is wiped on page refresh — refresh token cookie handles re-auth
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => { accessToken = token; },
  clear: () => { accessToken = null; },
};

export const getAccessToken = tokenStore.get;
export const setAccessToken = tokenStore.set;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      tokenStore.clear();
      return null;
    }

    const data = await res.json() as AuthResponse;
    tokenStore.set(data.data.accessToken);
    return data.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// ─── Base fetcher ─────────────────────────────────────────────────────────────
export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly cookie automatically
  });

  if (res.status === 401 && endpoint !== '/auth/refresh') {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });

      const retryData = retryRes.status === 204 ? null : await retryRes.json();

      if (!retryRes.ok) {
        throw new ApiError(retryData.message || 'Something went wrong', retryRes.status);
      }

      return retryData;
    }
  }

  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new ApiError(data.message || 'Something went wrong', res.status);
  }

  return data;
}

// ─── Typed API Error ──────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatar: string | null;
  role: 'GUEST' | 'HOST' | 'ADMIN';
  createdAt: string;
  totalProperties: number;
  totalReviews: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: AuthUser;
    message?: string;
  };
}

export interface MessageResponse {
  success: boolean;
  data: {
    email: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export interface PropertyListItem {
  id: string;
  title: string;
  city: string;
  country: string;
  pricePerNight: number;
  cleaningFee: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  type: string;
  primaryImage: string | null;
  host: {
    id: string;
    name: string;
    avatar: string | null;
  };
  averageRating: number | null;
  reviewCount: number;
}

export interface PropertyDetails extends Omit<PropertyListItem, 'primaryImage' | 'reviewCount'> {
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  images: Array<{
    id: string;
    url: string;
    caption?: string | null;
    isPrimary: boolean;
  }>;
  amenities: Array<{
    id: string;
    name: string;
    icon?: string | null;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      avatar?: string | null;
    };
  }>;
  _count?: {
    reviews: number;
    bookings: number;
  };
}

export interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  nightsCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  currency: string;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';
  paymentProvider?: 'PAYSTACK' | 'FLUTTERWAVE' | null;
  paymentReference?: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    pricePerNight: number;
  };
  guest: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface Conversation {
  _id: string;
  participantIds: string[];
  propertyId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCounts?: Record<string, number>;
  createdAt: string;
}

export interface Message {
  _id?: string;
  conversationId?: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
}

export type PropertyQuery = Partial<{
  page: number;
  limit: number;
  city: string;
  country: string;
  minPrice: number;
  maxPrice: number;
  maxGuests: number;
  propertyType: string;
  checkIn: string;
  checkOut: string;
  amenities: string;
  sortBy: 'pricePerNight' | 'createdAt' | 'maxGuests';
  sortOrder: 'asc' | 'desc';
}>;

const toQueryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) =>
    request<MessageResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyOtp: (data: { email: string; otp: string }) =>
    request<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resendOtp: (email: string) =>
    request<MessageResponse>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    request<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    request<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<MessageResponse>('/auth/logout', { method: 'POST' }),

  refresh: () =>
    request<AuthResponse>('/auth/refresh', { method: 'POST' }),

  me: () =>
    request<{ success: boolean; data: AuthUser }>('/auth/me'),
};

export const propertyApi = {
  list: (query: PropertyQuery = {}) =>
    request<{ success: boolean; data: PaginatedResponse<PropertyListItem> }>(
      `/properties${toQueryString(query)}`
    ),

  get: (id: string) =>
    request<{ success: boolean; data: PropertyDetails }>(`/properties/${id}`),

  hostProperties: (hostId: string) =>
    request<{ success: boolean; data: PropertyListItem[] }>(
      `/properties/host/${hostId}`
    ),

  create: (data: {
    title: string;
    description: string;
    type: string;
    pricePerNight: number;
    cleaningFee: number;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    amenities: string[];
  }) =>
    request<{ success: boolean; data: { id: string } }>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadImage: (propertyId: string, formData: FormData) =>
    request<{ success: boolean; data: unknown }>(
      `/properties/${propertyId}/images`,
      {
        method: 'POST',
        body: formData,
      }
    ),
};

export const bookingApi = {
  create: (data: { propertyId: string; checkIn: string; checkOut: string }) =>
    request<{ success: boolean; data: Booking }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  initializePayment: (
    bookingId: string,
    provider: 'PAYSTACK' | 'FLUTTERWAVE' = 'PAYSTACK'
  ) =>
    request<{
      success: boolean;
      data: {
        provider: 'PAYSTACK' | 'FLUTTERWAVE';
        authorizationUrl: string;
        reference: string;
      };
    }>(`/bookings/${bookingId}/payment/initialize`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),

  verifyPayment: (data: {
    provider: 'PAYSTACK' | 'FLUTTERWAVE';
    reference: string;
    transactionId?: string;
  }) =>
    request<{ success: boolean; data: { bookingId: string; status: string } }>(
      '/bookings/payment/verify',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  mine: (query: Partial<{ page: number; limit: number; status: string }> = {}) =>
    request<{ success: boolean; data: PaginatedResponse<Booking> }>(
      `/bookings/my${toQueryString(query)}`
    ),

  propertyBookings: (
    propertyId: string,
    query: Partial<{ page: number; limit: number; status: string }> = {}
  ) =>
    request<{ success: boolean; data: PaginatedResponse<Booking> }>(
      `/bookings/property/${propertyId}${toQueryString(query)}`
    ),

  cancel: (bookingId: string) =>
    request<{ success: boolean; data: unknown }>(
      `/bookings/${bookingId}/cancel`,
      { method: 'PATCH' }
    ),

  updateStatus: (bookingId: string, status: Booking['status']) =>
    request<{ success: boolean; data: unknown }>(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  delete: (bookingId: string) =>
    request<{ success: boolean; data: unknown }>(`/bookings/${bookingId}`, {
      method: 'DELETE',
    }),
};

export const userApi = {
  list: (query: Partial<{ page: number; limit: number; role: string; search: string }> = {}) =>
    request<{ success: boolean; data: PaginatedResponse<PublicProfile> }>(
      `/users${toQueryString(query)}`
    ),

  updateRole: (userId: string, role: PublicProfile['role']) =>
    request<{ success: boolean; data: Pick<PublicProfile, 'id' | 'name' | 'role'> }>(
      `/users/${userId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    ),

  delete: (userId: string) =>
    request<{ success: boolean; data: unknown }>(`/users/${userId}`, {
      method: 'DELETE',
    }),
};

export const reviewApi = {
  propertyReviews: (propertyId: string, query: Partial<{ page: number }> = {}) =>
    request<{ success: boolean; data: PaginatedResponse<PropertyDetails['reviews'][number]> }>(
      `/reviews/property/${propertyId}${toQueryString(query)}`
    ),

  create: (data: {
    propertyId: string;
    subjectId: string;
    rating: number;
    comment: string;
  }) =>
    request<{ success: boolean; data: unknown }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const chatApi = {
  conversations: () =>
    request<{ success: boolean; data: Conversation[] }>('/chat/conversations'),

  start: (data: { hostId: string; propertyId: string }) =>
    request<{ success: boolean; data: Conversation }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  messages: (conversationId: string) =>
    request<{
      success: boolean;
      data: { messages: Message[]; total: number; page: number; hasMore: boolean };
    }>(`/chat/conversations/${conversationId}/messages`),

  send: (conversationId: string, content: string) =>
    request<{ success: boolean; data: { conversation: Conversation; message: Message } }>(
      `/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    ),
};
