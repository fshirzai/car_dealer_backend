'use strict';

const request = require('supertest');
const createApp = require('../../src/app');
const {
  createTestCustomer,
  createTestUser,
  createTestVehicle,
  createTestOrder,
} = require('../helpers/factories');
const { generateToken } = require('../helpers/authHelper');
const { USER_ROLES, ORDER_STATUS, VEHICLE_STATUS } = require('../../src/constants/enums');
const env = require('../../src/config/env');

const app = createApp();
const customerBase = `${env.apiPrefix}/orders`;
const staffBase = `${env.apiPrefix}/orders/staff`;

const makeCustomerToken = async () => {
  const { user } = await createTestCustomer();
  return { token: generateToken(user), user };
};

const makeStaffToken = async (role = USER_ROLES.ADMIN) => {
  const { user } = await createTestUser({ role });
  return generateToken(user);
};

const publishedAvailable = () => ({
  isPublished: true,
  status: VEHICLE_STATUS.AVAILABLE,
});

describe('Order Routes (integration)', () => {
  describe('Customer POST /orders', () => {
    it('should create an order', async () => {
      const { token } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle(publishedAvailable());

      const res = await request(app)
        .post(customerBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ vehicleId: vehicle.id }] });

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toMatch(/^ORD-/);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('should 400 for unpublished vehicle', async () => {
      const { token } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle({ isPublished: false });

      const res = await request(app)
        .post(customerBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ vehicleId: vehicle.id }] });

      expect(res.status).toBe(400);
    });

    it('should 422 for duplicate vehicles', async () => {
      const { token } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle(publishedAvailable());

      const res = await request(app)
        .post(customerBase)
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ vehicleId: vehicle.id }, { vehicleId: vehicle.id }],
        });
      expect(res.status).toBe(422);
    });

    it('should 403 for non-customer roles', async () => {
      const token = await makeStaffToken(USER_ROLES.ADMIN);
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const res = await request(app)
        .post(customerBase)
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ vehicleId: vehicle.id }] });
      expect(res.status).toBe(403);
    });

    it('should 401 without token', async () => {
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const res = await request(app)
        .post(customerBase)
        .send({ items: [{ vehicleId: vehicle.id }] });
      expect(res.status).toBe(401);
    });
  });

  describe('Customer GET /orders/mine', () => {
    it('should list only my orders', async () => {
      const { token, user } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .get(`${customerBase}/mine`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Customer GET /orders/mine/:id', () => {
    it('should hide staffNotes', async () => {
      const { token, user } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle], {
        staffNotes: 'secret',
      });

      const res = await request(app)
        .get(`${customerBase}/mine/${order.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.staffNotes).toBeUndefined();
    });

    it('should 404 for another customer’s order', async () => {
      const { token: tokenA, user: userA } = await makeCustomerToken();
      const { user: userB } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(userB, [vehicle]);

      const res = await request(app)
        .get(`${customerBase}/mine/${order.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(404);
      void userA;
    });
  });

  describe('Customer cancel', () => {
    it('should cancel a PENDING order', async () => {
      const { token, user } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .post(`${customerBase}/mine/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Too expensive' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ORDER_STATUS.CANCELLED);
    });

    it('should refuse to cancel a non-PENDING order', async () => {
      const { token, user } = await makeCustomerToken();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle], {
        status: ORDER_STATUS.CONTACTED,
      });

      const res = await request(app)
        .post(`${customerBase}/mine/${order.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Staff GET /orders/staff', () => {
    it('should list all orders', async () => {
      const token = await makeStaffToken();
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .get(staffBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should 403 for customer role', async () => {
      const { token } = await makeCustomerToken();
      const res = await request(app)
        .get(staffBase)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Staff GET /orders/staff/:id', () => {
    it('should return the order', async () => {
      const token = await makeStaffToken();
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .get(`${staffBase}/${order.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(order.id);
    });
  });

  describe('Staff PATCH /orders/staff/:id/status', () => {
    it('should move PENDING → CONTACTED', async () => {
      const token = await makeStaffToken();
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .patch(`${staffBase}/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ORDER_STATUS.CONTACTED });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ORDER_STATUS.CONTACTED);
    });

    it('should reserve vehicles on CONFIRMED', async () => {
      const token = await makeStaffToken();
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle]);

      await request(app)
        .patch(`${staffBase}/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ORDER_STATUS.CONTACTED });

      await request(app)
        .patch(`${staffBase}/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ORDER_STATUS.CONFIRMED });

      const reloaded = await require('../../src/modules/vehicle/vehicle.model').findById(
        vehicle.id
      );
      expect(reloaded.status).toBe(VEHICLE_STATUS.RESERVED);
    });

    it('should 400 for invalid transition', async () => {
      const token = await makeStaffToken();
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .patch(`${staffBase}/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ORDER_STATUS.COMPLETED });
      expect(res.status).toBe(400);
    });
  });

  describe('Staff PATCH /orders/staff/:id/staff-notes', () => {
    it('should set staff notes', async () => {
      const token = await makeStaffToken();
      const { user } = await createTestCustomer();
      const { vehicle } = await createTestVehicle(publishedAvailable());
      const { order } = await createTestOrder(user, [vehicle]);

      const res = await request(app)
        .patch(`${staffBase}/${order.id}/staff-notes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ staffNotes: 'Called at 3pm' });
      expect(res.status).toBe(200);
      expect(res.body.data.staffNotes).toBe('Called at 3pm');
    });
  });
});