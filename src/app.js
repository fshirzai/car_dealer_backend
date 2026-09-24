'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const ApiResponse = require('./utils/ApiResponse');

const userRoutes = require('./modules/user/user.routes');
const authRoutes = require('./modules/auth/auth.routes');
const customerProfileRoutes = require('./modules/customerProfile/customerProfile.routes');
const sellerRoutes = require('./modules/seller/seller.routes');
const {
  publicRouter: vehiclePublicRoutes,
  staffRouter: vehicleStaffRoutes,
} = require('./modules/vehicle/vehicle.routes');
const vehicleProfitRoutes = require('./modules/vehicle/vehicle.profit.routes');
const {
  publicRouter: vehicleImagePublicRoutes,
  staffRouter: vehicleImageStaffRoutes,
} = require('./modules/vehicleImage/vehicleImage.routes');
const {
  publicRouter: vehicleVideoPublicRoutes,
  staffRouter: vehicleVideoStaffRoutes,
} = require('./modules/vehicleVideo/vehicleVideo.routes');
const favoriteRoutes = require('./modules/favorite/favorite.routes');
const cartItemRoutes = require('./modules/cartItem/cartItem.routes');
const {
  customerRouter: orderCustomerRoutes,
  staffRouter: orderStaffRoutes,
} = require('./modules/order/order.routes');
const purchaseRoutes = require('./modules/purchase/purchase.routes');
const saleRoutes = require('./modules/sale/sale.routes');
const vehicleExpenseRoutes = require('./modules/vehicleExpense/vehicleExpense.routes');
const generalExpenseRoutes = require('./modules/generalExpense/generalExpense.routes');
const auditLogRoutes = require('./modules/auditLog/auditLog.routes');
const {
  publicRouter: dealershipSettingsPublic,
  adminRouter: dealershipSettingsAdmin,
} = require('./modules/dealershipSettings/dealershipSettings.routes');
const path = require('path');
const uploadRoutes = require('./modules/upload/upload.routes');
const { UPLOAD_ROOT } = require('./modules/upload/upload.constants');

const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.cors.origin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: logger.stream }));
  }

  app.use(env.apiPrefix, apiLimiter);

  app.get('/health', (_req, res) => {
    res.json(ApiResponse.success({ status: 'ok', uptime: process.uptime() }));
  });

  app.use(`${env.apiPrefix}/auth`, authRoutes);
  app.use(`${env.apiPrefix}/users`, userRoutes);
  app.use(`${env.apiPrefix}/customer-profiles`, customerProfileRoutes);
  app.use(`${env.apiPrefix}/sellers`, sellerRoutes);

  // Vehicle sub-modules — staff first, then public
  app.use(`${env.apiPrefix}/vehicles/staff`, vehicleProfitRoutes); // profit BEFORE other /:id
  app.use(`${env.apiPrefix}/vehicles/staff`, vehicleStaffRoutes);
  app.use(`${env.apiPrefix}/vehicles/staff`, vehicleImageStaffRoutes);
  app.use(`${env.apiPrefix}/vehicles/staff`, vehicleVideoStaffRoutes);
  app.use(`${env.apiPrefix}/vehicles`, vehiclePublicRoutes);
  app.use(`${env.apiPrefix}/vehicles`, vehicleImagePublicRoutes);
  app.use(`${env.apiPrefix}/vehicles`, vehicleVideoPublicRoutes);

  app.use(`${env.apiPrefix}/favorites`, favoriteRoutes);
  app.use(`${env.apiPrefix}/cart`, cartItemRoutes);

  app.use(`${env.apiPrefix}/orders/staff`, orderStaffRoutes);
  app.use(`${env.apiPrefix}/orders`, orderCustomerRoutes);

  app.use(`${env.apiPrefix}/purchases`, purchaseRoutes);
  app.use(`${env.apiPrefix}/sales`, saleRoutes);
app.use(`${env.apiPrefix}/uploads`, uploadRoutes);
  app.use(`${env.apiPrefix}/vehicle-expenses`, vehicleExpenseRoutes);
  app.use(`${env.apiPrefix}/general-expenses`, generalExpenseRoutes);
  app.use(`${env.apiPrefix}/audit-logs`, auditLogRoutes);

  // Dealership settings — public path distinct from admin
  app.use(
    `${env.apiPrefix}/dealership-settings/public`,
    dealershipSettingsPublic
  );
  app.use(`${env.apiPrefix}/dealership-settings`, dealershipSettingsAdmin);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;