'use strict';

/* ------------------------------------------------------------------ */
/* Imports — ONE block at the top, all entities                       */
/* ------------------------------------------------------------------ */

const User = require('../../src/modules/user/user.model');
const CustomerProfile = require('../../src/modules/customerProfile/customerProfile.model');
const Seller = require('../../src/modules/seller/seller.model');
const Vehicle = require('../../src/modules/vehicle/vehicle.model');
const VehicleImage = require('../../src/modules/vehicleImage/vehicleImage.model');
const VehicleVideo = require('../../src/modules/vehicleVideo/vehicleVideo.model');
const Favorite = require('../../src/modules/favorite/favorite.model');
const CartItem = require('../../src/modules/cartItem/cartItem.model');
const Order = require('../../src/modules/order/order.model');
const Purchase = require('../../src/modules/purchase/purchase.model');
const Sale = require('../../src/modules/sale/sale.model');
const VehicleExpense = require('../../src/modules/vehicleExpense/vehicleExpense.model');
const GeneralExpense = require('../../src/modules/generalExpense/generalExpense.model');
const AuditLog = require('../../src/modules/auditLog/auditLog.model');

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
  ORDER_STATUS,
  SALE_CHANNEL,
  PAYMENT_STATUS,
  EXPENSE_CATEGORY,
  GENERAL_EXPENSE_CATEGORY,
} = require('../../src/constants/enums');

const { ACTION } = require('../../src/modules/auditLog/auditLog.constants');

const { generateStockNumber } = require('../../src/modules/vehicle/vehicle.utils');
const { generateOrderNumber } = require('../../src/modules/order/order.utils');
const {
  generatePurchaseNumber,
} = require('../../src/modules/purchase/purchase.utils');
const { generateSaleNumber } = require('../../src/modules/sale/sale.utils');
const DealershipSettings = require('../../src/modules/dealershipSettings/dealershipSettings.model');
const {
  SINGLETON_ID,
} = require('../../src/modules/dealershipSettings/dealershipSettings.constants');
/* ------------------------------------------------------------------ */
/* Internal counters                                                  */
/* ------------------------------------------------------------------ */

let counter = 0;
const nextSeq = () => ++counter;
const uniqueEmail = (prefix = 'user') =>
  `${prefix}${Date.now()}_${nextSeq()}@test.com`;

/* ================================================================== */
/* USER / CUSTOMER / SELLER                                           */
/* ================================================================== */

const buildUserPayload = (overrides = {}) => ({
  name: 'Test User',
  email: uniqueEmail(),
  password: 'Password123!',
  role: USER_ROLES.CUSTOMER,
  ...overrides,
});

const createTestUser = async (overrides = {}) => {
  const payload = buildUserPayload(overrides);
  const passwordHash = await User.hashPassword(payload.password);
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    passwordHash,
    role: payload.role,
    phone: payload.phone || null,
    image: payload.image || null,
  });
  return { user, password: payload.password };
};

const buildCustomerProfilePayload = (overrides = {}) => ({
  fullName: 'Test Customer',
  phone: '0700000000',
  address: '123 Main St',
  city: 'Kabul',
  country: 'Afghanistan',
  notes: 'VIP customer',
  ...overrides,
});

const createTestCustomer = async (overrides = {}) => {
  const PROFILE_KEYS = ['fullName', 'address', 'city', 'country', 'notes'];
  const userOverrides = {};
  const profileOverrides = {};

  Object.entries(overrides).forEach(([key, value]) => {
    if (PROFILE_KEYS.includes(key)) {
      profileOverrides[key] = value;
    } else if (key === 'phone') {
      userOverrides.phone = value;
      profileOverrides.phone = value;
    } else {
      userOverrides[key] = value;
    }
  });

  const { user, password } = await createTestUser({
    role: USER_ROLES.CUSTOMER,
    ...userOverrides,
  });

  const profile = await CustomerProfile.create({
    userId: user.id,
    ...buildCustomerProfilePayload({
      fullName: user.name,
      ...profileOverrides,
    }),
  });

  return { user, profile, password };
};

const buildSellerPayload = (overrides = {}) => ({
  name: 'Test Seller',
  type: SELLER_TYPE.INDIVIDUAL,
  phone: '0700000001',
  email: uniqueEmail('seller'),
  address: '456 Seller St',
  city: 'Kabul',
  country: 'Afghanistan',
  notes: 'Reliable supplier',
  ...overrides,
});

const createTestSeller = async (overrides = {}) => {
  const payload = buildSellerPayload(overrides);
  const seller = await Seller.create({
    name: payload.name,
    type: payload.type,
    phone: payload.phone,
    email: payload.email ? payload.email.toLowerCase() : null,
    address: payload.address,
    city: payload.city,
    country: payload.country,
    notes: payload.notes,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });
  return { seller };
};

/* ================================================================== */
/* VEHICLE                                                            */
/* ================================================================== */

const buildVehiclePayload = (overrides = {}) => ({
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
  mileageUnit: MILEAGE_UNIT.KM,
  description: 'Well-maintained sedan',
  purchasePrice: 10000,
  askingPrice: 13000,
  currency: 'USD',
  ...overrides,
});

const createTestVehicle = async (overrides = {}) => {
  const payload = buildVehiclePayload(overrides);
  const stockNumber = await generateStockNumber();

  const vehicle = await Vehicle.create({
    stockNumber,
    vin: payload.vin ? payload.vin.toUpperCase() : null,
    engineNumber: payload.engineNumber ? payload.engineNumber.toUpperCase() : null,
    make: payload.make,
    model: payload.model,
    year: payload.year,
    trim: payload.trim ?? null,
    color: payload.color ?? null,
    bodyType: payload.bodyType,
    fuelType: payload.fuelType,
    transmission: payload.transmission,
    driveType: payload.driveType,
    condition: payload.condition,
    mileage: payload.mileage,
    mileageUnit: payload.mileageUnit,
    description: payload.description ?? null,
    purchasePrice: payload.purchasePrice,
    askingPrice: payload.askingPrice,
    currency: payload.currency,
    status: payload.status || VEHICLE_STATUS.AVAILABLE,
    isPublished: payload.isPublished === true,
  });

  return { vehicle };
};

/* ================================================================== */
/* VEHICLE IMAGE / VIDEO                                              */
/* ================================================================== */

const buildVehicleImagePayload = (overrides = {}) => ({
  url: `https://cdn.example.com/vehicles/${Date.now()}-${nextSeq()}.jpg`,
  altText: 'Vehicle photo',
  sortOrder: 0,
  ...overrides,
});

const createTestVehicleImage = async (vehicleId, overrides = {}) => {
  const payload = buildVehicleImagePayload(overrides);
  const existingCount = await VehicleImage.countDocuments({ vehicleId });

  const image = await VehicleImage.create({
    vehicleId,
    url: payload.url,
    altText: payload.altText ?? null,
    sortOrder: payload.sortOrder ?? existingCount,
    isPrimary: payload.isPrimary !== undefined ? payload.isPrimary : existingCount === 0,
  });

  return { image };
};

const buildVehicleVideoPayload = (overrides = {}) => ({
  url: 'https://videos.example.com/walkthrough.mp4',
  thumbnailUrl: 'https://cdn.example.com/thumbs/walkthrough.jpg',
  title: 'Walk-around video',
  ...overrides,
});

const createTestVehicleVideo = async (vehicleId, overrides = {}) => {
  const payload = buildVehicleVideoPayload(overrides);
  const video = await VehicleVideo.create({
    vehicleId,
    url: payload.url,
    thumbnailUrl: payload.thumbnailUrl ?? null,
    title: payload.title ?? null,
  });
  return { video };
};

/* ================================================================== */
/* FAVORITE / CART                                                    */
/* ================================================================== */

const createTestFavorite = async (userId, vehicleId) => {
  const favorite = await Favorite.create({ userId, vehicleId });
  return { favorite };
};

const createTestCartItem = async (userId, vehicleId) => {
  const cartItem = await CartItem.create({ userId, vehicleId, quantity: 1 });
  return { cartItem };
};

/* ================================================================== */
/* ORDER                                                              */
/* ================================================================== */

const createTestOrder = async (customer, vehicles, overrides = {}) => {
  const items = vehicles.map((v) => ({
    vehicleId: v.id,
    vehicleName: `${v.make} ${v.model} ${v.year}${v.trim ? ` ${v.trim}` : ''}`.trim(),
    vehicleStockNumber: v.stockNumber,
    unitPrice: v.askingPrice,
    currency: v.currency || 'USD',
    quantity: 1,
  }));

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customerId: customer.id,
    status: overrides.status || ORDER_STATUS.PENDING,
    customerName: overrides.customerName || customer.name,
    customerPhone: overrides.customerPhone || customer.phone || '0700000000',
    customerEmail: overrides.customerEmail || customer.email,
    customerAddress: overrides.customerAddress ?? 'Kabul',
    customerNotes: overrides.customerNotes ?? null,
    staffNotes: overrides.staffNotes ?? null,
    items,
  });

  return { order };
};

/* ================================================================== */
/* PURCHASE                                                           */
/* ================================================================== */

const buildPurchasePayload = (overrides = {}) => ({
  purchasePrice: 10000,
  currency: 'USD',
  purchaseDate: new Date(),
  paymentStatus: PAYMENT_STATUS.PAID,
  notes: 'Purchased from local dealer',
  documentUrl: null,
  ...overrides,
});

const createTestPurchase = async ({ vehicle, seller, createdById, ...overrides }) => {
  const payload = buildPurchasePayload(overrides);
  const purchaseNumber = await generatePurchaseNumber();

  const purchase = await Purchase.create({
    purchaseNumber,
    vehicleId: vehicle.id,
    sellerId: seller.id,
    purchasePrice: payload.purchasePrice,
    currency: payload.currency,
    purchaseDate: payload.purchaseDate,
    paymentStatus: payload.paymentStatus,
    notes: payload.notes,
    documentUrl: payload.documentUrl,
    createdById,
  });

  return { purchase };
};

/* ================================================================== */
/* SALE                                                               */
/* ================================================================== */

const buildSalePayload = (overrides = {}) => ({
  salePrice: 13000,
  currency: 'USD',
  saleDate: new Date(),
  channel: SALE_CHANNEL.OFFLINE,
  paymentStatus: PAYMENT_STATUS.PAID,
  notes: 'Sold on-site',
  invoiceNumber: null,
  ...overrides,
});

const createTestSale = async ({ vehicle, customer, orderId, createdById, ...overrides }) => {
  const payload = buildSalePayload(overrides);
  const saleNumber = await generateSaleNumber();

  const sale = await Sale.create({
    saleNumber,
    vehicleId: vehicle.id,
    customerId: customer ? customer.id : null,
    salePrice: payload.salePrice,
    currency: payload.currency,
    saleDate: payload.saleDate,
    channel: payload.channel,
    orderId: orderId || null,
    paymentStatus: payload.paymentStatus,
    notes: payload.notes,
    invoiceNumber: payload.invoiceNumber,
    createdById,
  });

  await Vehicle.updateOne(
    { _id: vehicle.id },
    { $set: { status: VEHICLE_STATUS.SOLD, isPublished: false } }
  );

  return { sale };
};

/* ================================================================== */
/* VEHICLE EXPENSE                                                    */
/* ================================================================== */

const buildVehicleExpensePayload = (overrides = {}) => ({
  category: EXPENSE_CATEGORY.REPAIR,
  description: 'Brake pad replacement',
  amount: 250,
  currency: 'USD',
  expenseDate: new Date(),
  notes: 'Routine maintenance',
  documentUrl: null,
  ...overrides,
});

const createTestVehicleExpense = async ({ vehicle, createdById, ...overrides }) => {
  const payload = buildVehicleExpensePayload(overrides);
  const expense = await VehicleExpense.create({
    vehicleId: vehicle.id,
    category: payload.category,
    description: payload.description,
    amount: payload.amount,
    currency: payload.currency,
    expenseDate: payload.expenseDate,
    notes: payload.notes,
    documentUrl: payload.documentUrl,
    createdById,
  });
  return { expense };
};

/* ================================================================== */
/* GENERAL EXPENSE                                                    */
/* ================================================================== */

const buildGeneralExpensePayload = (overrides = {}) => ({
  category: GENERAL_EXPENSE_CATEGORY.RENT,
  description: 'Office rent — September',
  amount: 2000,
  currency: 'USD',
  expenseDate: new Date(),
  notes: 'Monthly rent',
  documentUrl: null,
  ...overrides,
});

const createTestGeneralExpense = async ({ createdById, ...overrides }) => {
  const payload = buildGeneralExpensePayload(overrides);
  const expense = await GeneralExpense.create({
    category: payload.category,
    description: payload.description,
    amount: payload.amount,
    currency: payload.currency,
    expenseDate: payload.expenseDate,
    notes: payload.notes,
    documentUrl: payload.documentUrl,
    createdById,
  });
  return { expense };
};

/* ================================================================== */
/* AUDIT LOG                                                          */
/* ================================================================== */

const buildAuditLogPayload = (overrides = {}) => ({
  action: ACTION.CREATE,
  entityType: 'Vehicle',
  entityId: null,
  description: 'Created a vehicle',
  oldValues: null,
  newValues: { make: 'Toyota' },
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
  ...overrides,
});
/* ================================================================== */
/* DEALERSHIP SETTINGS                                                */
/* ================================================================== */

const buildDealershipSettingsPayload = (overrides = {}) => ({
  businessName: 'Kabul Auto Traders',
  legalName: 'Kabul Auto Traders LLC',
  email: 'info@kabulautotraders.test',
  phone: '0700000000',
  address: '100 Industrial Road',
  city: 'Kabul',
  country: 'Afghanistan',
  logoUrl: null,
  websiteUrl: null,
  defaultCurrency: 'USD',
  timezone: 'Asia/Kabul',
  ...overrides,
});

const createTestDealershipSettings = async (overrides = {}) => {
  const payload = buildDealershipSettingsPayload(overrides);
  const settings = await DealershipSettings.create({
    _id: SINGLETON_ID,
    ...payload,
  });
  return { settings };
};
const createTestAuditLog = async ({ userId = null, ...overrides } = {}) => {
  const payload = buildAuditLogPayload(overrides);
  const log = await AuditLog.create({
    userId,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId,
    description: payload.description,
    oldValues: payload.oldValues,
    newValues: payload.newValues,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
  });
  return { log };
};

/* ================================================================== */
/* Exports                                                            */
/* ================================================================== */
module.exports = {
  // user
  buildUserPayload,
  createTestUser,
  uniqueEmail,
  // customer
  buildCustomerProfilePayload,
  createTestCustomer,
  // seller
  buildSellerPayload,
  createTestSeller,
  // vehicle
  buildVehiclePayload,
  createTestVehicle,
  // vehicle image
  buildVehicleImagePayload,
  createTestVehicleImage,
  // vehicle video
  buildVehicleVideoPayload,
  createTestVehicleVideo,
  // favorite
  createTestFavorite,
  // cart
  createTestCartItem,
  // order
  createTestOrder,
  // purchase
  buildPurchasePayload,
  createTestPurchase,
  // sale
  buildSalePayload,
  createTestSale,
  // vehicle expense
  buildVehicleExpensePayload,
  createTestVehicleExpense,
  // general expense
  buildGeneralExpensePayload,
  createTestGeneralExpense,
  // audit log
  buildAuditLogPayload,
  createTestAuditLog,
  // dealership settings
  buildDealershipSettingsPayload,
  createTestDealershipSettings,
};