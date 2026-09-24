'use strict';

/**
 * Seed the Car Dealership database with demo data.
 *
 * Usage:
 *   node scripts/seed.js           # add demo data (safe — skips existing)
 *   node scripts/seed.js --fresh   # DROP everything first, then seed
 *   node scripts/seed.js --help
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const logger = require('../src/config/logger');
const env = require('../src/config/env');

/* ------------------------------------------------------------------ */
/* Models                                                             */
/* ------------------------------------------------------------------ */
const User = require('../src/modules/user/user.model');
const CustomerProfile = require('../src/modules/customerProfile/customerProfile.model');
const Seller = require('../src/modules/seller/seller.model');
const Vehicle = require('../src/modules/vehicle/vehicle.model');
const VehicleImage = require('../src/modules/vehicleImage/vehicleImage.model');
const VehicleVideo = require('../src/modules/vehicleVideo/vehicleVideo.model');
const Purchase = require('../src/modules/purchase/purchase.model');
const Sale = require('../src/modules/sale/sale.model');
const VehicleExpense = require('../src/modules/vehicleExpense/vehicleExpense.model');
const GeneralExpense = require('../src/modules/generalExpense/generalExpense.model');
const DealershipSettings = require('../src/modules/dealershipSettings/dealershipSettings.model');
const Order = require('../src/modules/order/order.model');
const Favorite = require('../src/modules/favorite/favorite.model');
const CartItem = require('../src/modules/cartItem/cartItem.model');

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */
const { generateStockNumber } = require('../src/modules/vehicle/vehicle.utils');
const { generatePurchaseNumber } = require('../src/modules/purchase/purchase.utils');
const { generateSaleNumber } = require('../src/modules/sale/sale.utils');
const { generateOrderNumber } = require('../src/modules/order/order.utils');

const {
  USER_ROLES,
  SELLER_TYPE,
  BODY_TYPE,
  FUEL_TYPE,
  TRANSMISSION,
  DRIVE_TYPE,
  VEHICLE_CONDITION,
  MILEAGE_UNIT,
  VEHICLE_STATUS,
  SALE_CHANNEL,
  PAYMENT_STATUS,
  EXPENSE_CATEGORY,
  GENERAL_EXPENSE_CATEGORY,
  ORDER_STATUS,
} = require('../src/constants/enums');

const { SINGLETON_ID } = require('../src/modules/dealershipSettings/dealershipSettings.constants');

/* ------------------------------------------------------------------ */
/* CLI options                                                        */
/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  // eslint-disable-next-line no-console
  console.log(`
  Usage:
    node scripts/seed.js           Seed demo data (skips if already present)
    node scripts/seed.js --fresh   Drop everything first, then seed
    node scripts/seed.js --help    Show this help
  `);
  process.exit(0);
}
const FRESH = args.includes('--fresh');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const log = (msg) => logger.info(`[seed] ${msg}`);

const upsertUser = async ({ name, email, password, role, phone }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    log(`User exists: ${email}`);
    return existing;
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    phone: phone || null,
  });
  log(`Created ${role}: ${email}`);
  return user;
};

const dropAllData = async () => {
  log('Dropping all collections...');
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  log('All collections cleared');
};

/* ------------------------------------------------------------------ */
/* Main seed                                                          */
/* ------------------------------------------------------------------ */
const seed = async () => {
  if (FRESH) await dropAllData();

  /* ------------------------------ */
  /* 1. Users                       */
  /* ------------------------------ */
  log('--- Users ---');

  const admin = await upsertUser({
    name: 'Admin User',
    email: 'admin@dealership.com',
    password: 'Admin123!',
    role: USER_ROLES.ADMIN,
    phone: '0700000001',
  });

  const sellerUser = await upsertUser({
    name: 'Sam Seller',
    email: 'seller@dealership.com',
    password: 'Seller123!',
    role: USER_ROLES.SELLER,
    phone: '0700000002',
  });

  const customerUser = await upsertUser({
    name: 'Carla Customer',
    email: 'customer@dealership.com',
    password: 'Customer123!',
    role: USER_ROLES.CUSTOMER,
    phone: '0700000003',
  });

  const customerUser2 = await upsertUser({
    name: 'Bob Buyer',
    email: 'bob@dealership.com',
    password: 'Customer123!',
    role: USER_ROLES.CUSTOMER,
    phone: '0700000004',
  });

  /* ------------------------------ */
  /* 2. Customer profiles           */
  /* ------------------------------ */
  log('--- Customer profiles ---');

  const ensureCustomerProfile = async (user, city, address) => {
    const existing = await CustomerProfile.findOne({ userId: user.id });
    if (existing) return existing;
    const profile = await CustomerProfile.create({
      userId: user.id,
      fullName: user.name,
      phone: user.phone || '0700000000',
      address,
      city,
      country: 'Afghanistan',
      notes: 'Seeded customer',
    });
    log(`Created profile for ${user.email}`);
    return profile;
  };

  await ensureCustomerProfile(customerUser, 'Kabul', '15 Flower Street');
  await ensureCustomerProfile(customerUser2, 'Herat', '77 Silk Road');

  /* ------------------------------ */
  /* 3. Dealership settings         */
  /* ------------------------------ */
  log('--- Dealership settings ---');

  await DealershipSettings.findOneAndUpdate(
    { _id: SINGLETON_ID },
    {
      $set: {
        _id: SINGLETON_ID,
        businessName: 'Kabul Auto Traders',
        legalName: 'Kabul Auto Traders LLC',
        email: 'info@kabulautotraders.com',
        phone: '0700000000',
        address: '100 Industrial Road',
        city: 'Kabul',
        country: 'Afghanistan',
        logoUrl: null,
        websiteUrl: 'https://kabulautotraders.com',
        defaultCurrency: 'USD',
        timezone: 'Asia/Kabul',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  log('Dealership settings ready');

  /* ------------------------------ */
  /* 4. Sellers                     */
  /* ------------------------------ */
  log('--- Sellers ---');

  const ensureSeller = async (payload) => {
    const existing = await Seller.findOne({ name: payload.name });
    if (existing) return existing;
    const seller = await Seller.create(payload);
    log(`Created seller: ${payload.name}`);
    return seller;
  };

  const sellerA = await ensureSeller({
    name: 'Ahmad Motors',
    type: SELLER_TYPE.INDIVIDUAL,
    phone: '0720000001',
    email: 'ahmad.motors@example.com',
    address: '12 Market Street',
    city: 'Kabul',
    country: 'Afghanistan',
    notes: 'Reliable individual seller',
    isActive: true,
  });

  const sellerB = await ensureSeller({
    name: 'Silk Road Auto Import',
    type: SELLER_TYPE.COMPANY,
    phone: '0720000002',
    email: 'imports@silkroadauto.com',
    address: '45 Trade Center',
    city: 'Herat',
    country: 'Afghanistan',
    notes: 'Bulk importer — best for hybrids',
    isActive: true,
  });

  /* ------------------------------ */
  /* 5. Vehicles                    */
  /* ------------------------------ */
  log('--- Vehicles ---');

  const ensureVehicle = async (payload) => {
    const existing = await Vehicle.findOne({
      make: payload.make,
      model: payload.model,
      year: payload.year,
      vin: payload.vin,
    });
    if (existing) {
      log(`Vehicle exists: ${payload.make} ${payload.model} (${payload.vin})`);
      return existing;
    }

    const stockNumber = await generateStockNumber();
    const vehicle = await Vehicle.create({
      stockNumber,
      vin: payload.vin,
      engineNumber: payload.engineNumber || null,
      make: payload.make,
      model: payload.model,
      year: payload.year,
      trim: payload.trim || null,
      color: payload.color || null,
      bodyType: payload.bodyType,
      fuelType: payload.fuelType,
      transmission: payload.transmission,
      driveType: payload.driveType,
      condition: payload.condition,
      mileage: payload.mileage,
      mileageUnit: payload.mileageUnit || MILEAGE_UNIT.KM,
      description: payload.description || null,
      purchasePrice: payload.purchasePrice,
      askingPrice: payload.askingPrice,
      currency: 'USD',
      status: payload.status || VEHICLE_STATUS.AVAILABLE,
      isPublished: payload.isPublished !== false,
    });
    log(`Created vehicle: ${stockNumber} ${payload.make} ${payload.model}`);
    return vehicle;
  };

  const vehicles = [];

  vehicles.push(
    await ensureVehicle({
      vin: 'JTDBR32E730123456',
      engineNumber: 'ENG-TOY-0001',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      trim: 'LE',
      color: 'White',
      bodyType: BODY_TYPE.SEDAN,
      fuelType: FUEL_TYPE.PETROL,
      transmission: TRANSMISSION.AUTOMATIC,
      driveType: DRIVE_TYPE.FWD,
      condition: VEHICLE_CONDITION.USED,
      mileage: 45000,
      description: 'Well-maintained, single owner, full service history.',
      purchasePrice: 10000,
      askingPrice: 13000,
      isPublished: true,
    })
  );

  vehicles.push(
    await ensureVehicle({
      vin: 'JHMFA16508S123457',
      engineNumber: 'ENG-HON-0002',
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      trim: 'EX',
      color: 'Blue',
      bodyType: BODY_TYPE.SEDAN,
      fuelType: FUEL_TYPE.PETROL,
      transmission: TRANSMISSION.CVT,
      driveType: DRIVE_TYPE.FWD,
      condition: VEHICLE_CONDITION.USED,
      mileage: 28000,
      description: 'Low mileage, sunroof, one previous owner.',
      purchasePrice: 12000,
      askingPrice: 15500,
      isPublished: true,
    })
  );

  vehicles.push(
    await ensureVehicle({
      vin: '5YJ3E1EA7KF123458',
      engineNumber: 'ENG-TES-0003',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      trim: 'Long Range',
      color: 'Black',
      bodyType: BODY_TYPE.SEDAN,
      fuelType: FUEL_TYPE.ELECTRIC,
      transmission: TRANSMISSION.AUTOMATIC,
      driveType: DRIVE_TYPE.AWD,
      condition: VEHICLE_CONDITION.USED,
      mileage: 15000,
      description: 'Full self-driving package. Excellent condition.',
      purchasePrice: 32000,
      askingPrice: 38000,
      isPublished: true,
    })
  );

  vehicles.push(
    await ensureVehicle({
      vin: '4T1B11HK5KU123459',
      engineNumber: 'ENG-TOY-0004',
      make: 'Toyota',
      model: 'Camry',
      year: 2019,
      trim: 'SE',
      color: 'Silver',
      bodyType: BODY_TYPE.SEDAN,
      fuelType: FUEL_TYPE.PETROL,
      transmission: TRANSMISSION.AUTOMATIC,
      driveType: DRIVE_TYPE.FWD,
      condition: VEHICLE_CONDITION.USED,
      mileage: 62000,
      description: 'Sporty SE trim, clean interior, new tires.',
      purchasePrice: 14000,
      askingPrice: 17500,
      isPublished: true,
    })
  );

  vehicles.push(
    await ensureVehicle({
      vin: '5J6RW2H89KL123460',
      engineNumber: 'ENG-HON-0005',
      make: 'Honda',
      model: 'CR-V',
      year: 2020,
      trim: 'EX-L',
      color: 'Dark Grey',
      bodyType: BODY_TYPE.SUV,
      fuelType: FUEL_TYPE.PETROL,
      transmission: TRANSMISSION.CVT,
      driveType: DRIVE_TYPE.AWD,
      condition: VEHICLE_CONDITION.CERTIFIED_PRE_OWNED,
      mileage: 38000,
      description: 'Certified pre-owned, leather seats, AWD.',
      purchasePrice: 22000,
      askingPrice: 27500,
      isPublished: true,
    })
  );

  vehicles.push(
    await ensureVehicle({
      vin: '1HGCV1F3XLA123461',
      engineNumber: 'ENG-HON-0006',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      trim: 'Sport',
      color: 'Red',
      bodyType: BODY_TYPE.SEDAN,
      fuelType: FUEL_TYPE.PETROL,
      transmission: TRANSMISSION.AUTOMATIC,
      driveType: DRIVE_TYPE.FWD,
      condition: VEHICLE_CONDITION.USED,
      mileage: 22000,
      description: 'Sport trim, fresh service, ready to drive.',
      purchasePrice: 18000,
      askingPrice: 22500,
      isPublished: true,
    })
  );

  /* ------------------------------ */
  /* 6. Vehicle images              */
  /* ------------------------------ */
  log('--- Vehicle images ---');

  const imageSeeds = [
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8',
    'https://images.unsplash.com/photo-1550355291-bbee04a92027',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c',
  ];

  for (const vehicle of vehicles) {
    const existing = await VehicleImage.countDocuments({ vehicleId: vehicle.id });
    if (existing > 0) continue;

    const seedUrl = imageSeeds[vehicles.indexOf(vehicle) % imageSeeds.length];
    await VehicleImage.create({
      vehicleId: vehicle.id,
      url: `${seedUrl}?w=1200`,
      altText: `${vehicle.make} ${vehicle.model} ${vehicle.year} photo`,
      sortOrder: 0,
      isPrimary: true,
    });
    await VehicleImage.create({
      vehicleId: vehicle.id,
      url: `${seedUrl}?w=1200&variant=2`,
      altText: `${vehicle.make} ${vehicle.model} — alternate view`,
      sortOrder: 1,
      isPrimary: false,
    });
    log(`Added images for ${vehicle.stockNumber}`);
  }

  /* ------------------------------ */
  /* 7. Vehicle videos              */
  /* ------------------------------ */
  log('--- Vehicle videos ---');

  for (const vehicle of vehicles.slice(0, 3)) {
    const existing = await VehicleVideo.findOne({ vehicleId: vehicle.id });
    if (existing) continue;
    await VehicleVideo.create({
      vehicleId: vehicle.id,
      url: 'https://example.com/videos/walkaround.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
      title: `${vehicle.make} ${vehicle.model} — walk-around`,
    });
    log(`Added video for ${vehicle.stockNumber}`);
  }

  /* ------------------------------ */
  /* 8. Purchases                   */
  /* ------------------------------ */
  log('--- Purchases ---');

  const sellers = [sellerA, sellerB];

  for (let i = 0; i < vehicles.length; i += 1) {
    const vehicle = vehicles[i];
    const seller = sellers[i % sellers.length];

    const existing = await Purchase.findOne({ vehicleId: vehicle.id });
    if (existing) {
      log(`Purchase already exists for ${vehicle.stockNumber}`);
      continue;
    }

    const purchaseNumber = await generatePurchaseNumber();
    await Purchase.create({
      purchaseNumber,
      vehicleId: vehicle.id,
      sellerId: seller.id,
      purchasePrice: vehicle.purchasePrice,
      currency: 'USD',
      purchaseDate: new Date(Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000),
      paymentStatus: PAYMENT_STATUS.PAID,
      notes: `Acquired from ${seller.name}`,
      documentUrl: null,
      createdById: admin.id,
    });
    log(`Created purchase ${purchaseNumber} for ${vehicle.stockNumber}`);
  }

  /* ------------------------------ */
  /* 9. Vehicle expenses            */
  /* ------------------------------ */
  log('--- Vehicle expenses ---');

  const expenseTemplates = [
    { category: EXPENSE_CATEGORY.TRANSPORT, description: 'Transport from seller', amount: 300 },
    { category: EXPENSE_CATEGORY.REPAIR,    description: 'Brake pad replacement', amount: 180 },
    { category: EXPENSE_CATEGORY.CLEANING,  description: 'Full detailing',       amount: 60 },
  ];

  for (let i = 0; i < vehicles.length; i += 1) {
    const vehicle = vehicles[i];
    const existing = await VehicleExpense.countDocuments({ vehicleId: vehicle.id });
    if (existing > 0) continue;

    // Every vehicle gets at least one expense; some get more
    const templates = i % 2 === 0 ? expenseTemplates : expenseTemplates.slice(0, 2);
    for (const t of templates) {
      await VehicleExpense.create({
        vehicleId: vehicle.id,
        category: t.category,
        description: t.description,
        amount: t.amount,
        currency: 'USD',
        expenseDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        documentUrl: null,
        notes: null,
        createdById: sellerUser.id,
      });
    }
    log(`Added ${templates.length} expenses for ${vehicle.stockNumber}`);
  }

  /* ------------------------------ */
  /* 10. General expenses           */
  /* ------------------------------ */
  log('--- General expenses ---');

  const generalCount = await GeneralExpense.countDocuments();
  if (generalCount === 0) {
    const generalExpenses = [
      {
        category: GENERAL_EXPENSE_CATEGORY.RENT,
        description: 'Showroom rent — current month',
        amount: 2500,
      },
      {
        category: GENERAL_EXPENSE_CATEGORY.UTILITIES,
        description: 'Electricity + water',
        amount: 350,
      },
      {
        category: GENERAL_EXPENSE_CATEGORY.SALARIES,
        description: 'Staff salaries',
        amount: 6000,
      },
      {
        category: GENERAL_EXPENSE_CATEGORY.MARKETING,
        description: 'Online advertising campaign',
        amount: 800,
      },
      {
        category: GENERAL_EXPENSE_CATEGORY.SUPPLIES,
        description: 'Office supplies',
        amount: 120,
      },
    ];

    for (const g of generalExpenses) {
      await GeneralExpense.create({
        category: g.category,
        description: g.description,
        amount: g.amount,
        currency: 'USD',
        expenseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        documentUrl: null,
        notes: null,
        createdById: admin.id,
      });
    }
    log(`Created ${generalExpenses.length} general expenses`);
  } else {
    log('General expenses already present — skipping');
  }

  /* ------------------------------ */
  /* 11. Sale (one completed deal)  */
  /* ------------------------------ */
  log('--- Sales ---');

  const saleVehicle = vehicles[0]; // Toyota Corolla
  const existingSale = await Sale.findOne({ vehicleId: saleVehicle.id });

  if (!existingSale) {
    const saleNumber = await generateSaleNumber();
    await Sale.create({
      saleNumber,
      vehicleId: saleVehicle.id,
      customerId: customerUser.id,
      salePrice: 13000,
      currency: 'USD',
      saleDate: new Date(),
      channel: SALE_CHANNEL.ONLINE,
      orderId: null,
      paymentStatus: PAYMENT_STATUS.PAID,
      notes: 'Sold to demo customer',
      invoiceNumber: `INV-${Date.now()}`,
      createdById: sellerUser.id,
    });

    // Mark vehicle as SOLD
    await Vehicle.updateOne(
      { _id: saleVehicle.id },
      { $set: { status: VEHICLE_STATUS.SOLD, isPublished: false } }
    );

    log(`Created sale ${saleNumber} for ${saleVehicle.stockNumber}`);
  } else {
    log('Sale already exists — skipping');
  }

  /* ------------------------------ */
  /* 12. Customer order             */
  /* ------------------------------ */
  log('--- Orders ---');

  const orderVehicle = vehicles[1]; // Honda Civic
  const existingOrder = await Order.findOne({
    customerId: customerUser2.id,
    'items.vehicleId': orderVehicle.id,
  });

  if (!existingOrder) {
    const orderNumber = await generateOrderNumber();
    await Order.create({
      orderNumber,
      customerId: customerUser2.id,
      status: ORDER_STATUS.PENDING,
      customerName: customerUser2.name,
      customerPhone: customerUser2.phone || '0700000004',
      customerEmail: customerUser2.email,
      customerAddress: '77 Silk Road, Herat',
      customerNotes: 'Please call after 5pm',
      items: [
        {
          vehicleId: orderVehicle.id,
          vehicleName: `${orderVehicle.make} ${orderVehicle.model} ${orderVehicle.year}`,
          vehicleStockNumber: orderVehicle.stockNumber,
          unitPrice: orderVehicle.askingPrice,
          currency: 'USD',
          quantity: 1,
        },
      ],
    });
    log(`Created order ${orderNumber} for ${orderVehicle.stockNumber}`);
  } else {
    log('Order already exists — skipping');
  }

  /* ------------------------------ */
  /* 13. Favorites & cart           */
  /* ------------------------------ */
  log('--- Favorites & cart ---');

  const favVehicle = vehicles[2]; // Tesla
  const existingFav = await Favorite.findOne({
    userId: customerUser.id,
    vehicleId: favVehicle.id,
  });
  if (!existingFav) {
    await Favorite.create({ userId: customerUser.id, vehicleId: favVehicle.id });
    log(`Added favorite for ${customerUser.email}`);
  }

  const cartVehicle = vehicles[3]; // Camry
  const existingCart = await CartItem.findOne({
    userId: customerUser.id,
    vehicleId: cartVehicle.id,
  });
  if (!existingCart) {
    await CartItem.create({
      userId: customerUser.id,
      vehicleId: cartVehicle.id,
      quantity: 1,
    });
    log(`Added cart item for ${customerUser.email}`);
  }

  /* ------------------------------ */
  /* Done                           */
  /* ------------------------------ */
  log('');
  log('============================================================');
  log('  ✅ Seed complete');
  log('============================================================');
  log('');
  log('Login credentials:');
  log('  Admin     → admin@dealership.com     / Admin123!');
  log('  Seller    → seller@dealership.com    / Seller123!');
  log('  Customer  → customer@dealership.com  / Customer123!');
  log('  Customer  → bob@dealership.com       / Customer123!');
  log('');
};

/* ------------------------------------------------------------------ */
/* Bootstrap                                                          */
/* ------------------------------------------------------------------ */
(async () => {
  try {
    await connectDB(env.mongodbUri);
    await seed();
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    try {
      await disconnectDB();
    } catch (_e) {
      // ignore
    }
    process.exit(1);
  }
})();