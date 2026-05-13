// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'GUEST' | 'HOST' | 'ADMIN';
  avatar?: string;
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'GUEST' | 'HOST';
}

// ─── Property ─────────────────────────────────────────────────────────────────
export interface Property {
  id: string;
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
  isActive: boolean;
  hostId: string;
  host: {
    id: string;
    name: string;
    avatar?: string;
  };
  images: PropertyImage[];
  amenities: Amenity[];
  createdAt: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  caption?: string;
  isPrimary: boolean;
}

export interface Amenity {
  id: string;
  name: string;
  icon?: string;
}

// ─── Booking ──────────────────────────────────────────────────────────────────
export interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  nightsCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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
    avatar?: string;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface Conversation {
  _id: string;
  participantIds: string[];
  propertyId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}