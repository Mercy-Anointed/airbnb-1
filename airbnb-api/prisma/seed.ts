import { PrismaClient, PropertyType, UserRole } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create Users ──────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@airbnb.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  const host1 = await prisma.user.create({
    data: {
      email: 'host1@airbnb.com',
      name: 'John Host',
      role: UserRole.HOST,
    },
  });

  const host2 = await prisma.user.create({
    data: {
      email: 'host2@airbnb.com',
      name: 'Sarah Host',
      role: UserRole.HOST,
    },
  });

  const guest1 = await prisma.user.create({
    data: {
      email: 'guest1@airbnb.com',
      name: 'Alice Guest',
      role: UserRole.GUEST,
    },
  });

  const guest2 = await prisma.user.create({
    data: {
      email: 'guest2@airbnb.com',
      name: 'Bob Guest',
      role: UserRole.GUEST,
    },
  });

  console.log('✅ Users created');

  // ─── Create Properties ─────────────────────────────────────────────────────
  const property1 = await prisma.property.create({
    data: {
      title: 'Luxury Beachfront Villa in Lagos',
      description:
        'Experience the ultimate luxury in this stunning beachfront villa. ' +
        'Featuring panoramic ocean views, private pool, and direct beach access. ' +
        'Perfect for families or groups looking for an unforgettable getaway.',
      type: PropertyType.VILLA,
      pricePerNight: 150000,
      cleaningFee: 15000,
      maxGuests: 10,
      bedrooms: 5,
      bathrooms: 4,
      address: '15 Ocean Drive, Victoria Island',
      city: 'Lagos',
      country: 'Nigeria',
      latitude: 6.4281,
      longitude: 3.4219,
      hostId: host1.id,
      amenities: {
        create: [
          { name: 'WiFi' },
          { name: 'Pool' },
          { name: 'Kitchen' },
          { name: 'Parking' },
          { name: 'Air Conditioning' },
          { name: 'Beach Access' },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811',
            caption: 'Front view',
            isPrimary: true,
          },
          {
            url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
            caption: 'Pool area',
            isPrimary: false,
          },
        ],
      },
    },
  });

  const property2 = await prisma.property.create({
    data: {
      title: 'Modern Apartment in Abuja City Center',
      description:
        'Sleek and modern apartment in the heart of Abuja. ' +
        'Walking distance to major attractions, restaurants, and business districts. ' +
        'Ideal for business travelers and tourists alike.',
      type: PropertyType.APARTMENT,
      pricePerNight: 45000,
      cleaningFee: 5000,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 2,
      address: '7 Wuse Zone 4',
      city: 'Abuja',
      country: 'Nigeria',
      latitude: 9.0579,
      longitude: 7.4951,
      hostId: host1.id,
      amenities: {
        create: [
          { name: 'WiFi' },
          { name: 'Kitchen' },
          { name: 'Air Conditioning' },
          { name: 'Workspace' },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
            caption: 'Living room',
            isPrimary: true,
          },
        ],
      },
    },
  });

  const property3 = await prisma.property.create({
    data: {
      title: 'Cozy Studio in Port Harcourt',
      description:
        'A cozy and well-furnished studio apartment in the Garden City. ' +
        'Quiet neighborhood with easy access to major roads and amenities. ' +
        'Perfect for solo travelers or couples.',
      type: PropertyType.STUDIO,
      pricePerNight: 25000,
      cleaningFee: 3000,
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      address: '3 GRA Phase 2',
      city: 'Port Harcourt',
      country: 'Nigeria',
      latitude: 4.8156,
      longitude: 7.0498,
      hostId: host2.id,
      amenities: {
        create: [
          { name: 'WiFi' },
          { name: 'Kitchen' },
          { name: 'Air Conditioning' },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
            caption: 'Studio view',
            isPrimary: true,
          },
        ],
      },
    },
  });

  console.log('✅ Properties created');

  // ─── Create Bookings ───────────────────────────────────────────────────────
  const booking1 = await prisma.booking.create({
    data: {
      checkIn: new Date('2025-01-10'),
      checkOut: new Date('2025-01-15'),
      nightsCount: 5,
      totalPrice: 750000,
      status: 'COMPLETED',
      guestId: guest1.id,
      propertyId: property1.id,
    },
  });

  await prisma.booking.create({
    data: {
      checkIn: new Date('2026-04-01'),
      checkOut: new Date('2026-04-05'),
      nightsCount: 4,
      totalPrice: 180000,
      status: 'CONFIRMED',
      guestId: guest2.id,
      propertyId: property2.id,
    },
  });

  console.log('✅ Bookings created');

  // ─── Create Reviews ────────────────────────────────────────────────────────
  // Only for COMPLETED bookings — enforces our business rule
  await prisma.review.create({
    data: {
      rating: 5,
      comment:
        'Absolutely stunning property! The beach access was incredible ' +
        'and the host was very responsive. Highly recommend.',
      authorId: guest1.id,
      subjectId: host1.id,
      propertyId: property1.id,
    },
  });

  console.log('Reviews created');
  console.log('');
  console.log('Seed complete. Test accounts:');
  console.log(`   Admin:  ${admin.email} (id: ${admin.id})`);
  console.log(`   Host 1: ${host1.email} (id: ${host1.id})`);
  console.log(`   Host 2: ${host2.email} (id: ${host2.id})`);
  console.log(`   Guest 1: ${guest1.email} (id: ${guest1.id})`);
  console.log(`   Guest 2: ${guest2.email} (id: ${guest2.id})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });