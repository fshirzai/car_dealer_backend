'use strict';

const service = require('../vehicle.service');
const Vehicle = require('../vehicle.model');
const { VEHICLE_STATUS, BODY_TYPE, FUEL_TYPE } = require('../../../constants/enums');
const {
  buildVehiclePayload,
  createTestVehicle,
} = require('../../../../tests/helpers/factories');

describe('VehicleService (unit)', () => {
  describe('createVehicle', () => {
    it('should create a vehicle with all fields', async () => {
      const payload = buildVehiclePayload();
      const vehicle = await service.createVehicle(payload);

      expect(vehicle.id).toBeDefined();
      expect(vehicle.stockNumber).toMatch(/^STK-\d{6}-\d{4}$/);
      expect(vehicle.make).toBe('Toyota');
      expect(vehicle.status).toBe(VEHICLE_STATUS.AVAILABLE);
      expect(vehicle.isPublished).toBe(false);
    });

    it('should uppercase VIN and engine number', async () => {
      const vehicle = await service.createVehicle(
        buildVehiclePayload({ vin: 'abc123xyz', engineNumber: 'eng-001' })
      );
      expect(vehicle.vin).toBe('ABC123XYZ');
      expect(vehicle.engineNumber).toBe('ENG-001');
    });

    it('should accept vehicle without VIN or engine number', async () => {
      const vehicle = await service.createVehicle(
        buildVehiclePayload({ vin: null, engineNumber: null })
      );
      expect(vehicle.vin).toBeNull();
      expect(vehicle.engineNumber).toBeNull();
    });

    it('should allow multiple vehicles with null VIN and null engineNumber', async () => {
      const a = await service.createVehicle(
        buildVehiclePayload({ vin: null, engineNumber: null })
      );
      const b = await service.createVehicle(
        buildVehiclePayload({ vin: null, engineNumber: null })
      );
      expect(a.id).not.toBe(b.id);
      expect(a.vin).toBeNull();
      expect(b.vin).toBeNull();
    });

    it('should reject duplicate VIN', async () => {
      await createTestVehicle({ vin: 'DUP123' });
      await expect(
        service.createVehicle(buildVehiclePayload({ vin: 'dup123' }))
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should reject duplicate engine number', async () => {
      await createTestVehicle({ engineNumber: 'ENG-DUP' });
      await expect(
        service.createVehicle(buildVehiclePayload({ engineNumber: 'eng-dup' }))
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should support creating as published', async () => {
      const vehicle = await service.createVehicle(
        buildVehiclePayload({ isPublished: true })
      );
      expect(vehicle.isPublished).toBe(true);
    });
  });

  describe('listVehicles (staff)', () => {
    beforeEach(async () => {
      await createTestVehicle({
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        askingPrice: 12000,
      });
      await createTestVehicle({
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        askingPrice: 15000,
      });
      await createTestVehicle({
        make: 'Toyota',
        model: 'Camry',
        year: 2019,
        askingPrice: 18000,
        status: VEHICLE_STATUS.SOLD,
      });
    });

    it('should paginate', async () => {
      const { items, meta } = await service.listVehicles({ page: 1, limit: 2 });
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(3);
    });

    it('should filter by make (case-insensitive)', async () => {
      const { items } = await service.listVehicles({ make: 'toyota' });
      expect(items).toHaveLength(2);
    });

    it('should filter by model', async () => {
      const { items } = await service.listVehicles({ model: 'Corolla' });
      expect(items).toHaveLength(1);
    });

    it('should filter by year range', async () => {
      const { items } = await service.listVehicles({ yearMin: 2020 });
      expect(items).toHaveLength(2);
    });

    it('should filter by price range', async () => {
      const { items } = await service.listVehicles({
        priceMin: 13000,
        priceMax: 16000,
      });
      expect(items).toHaveLength(1);
      expect(items[0].model).toBe('Civic');
    });

    it('should filter by status', async () => {
      const { items } = await service.listVehicles({
        status: VEHICLE_STATUS.SOLD,
      });
      expect(items).toHaveLength(1);
    });

    it('should search across make/model/stockNumber/vin', async () => {
      const { items } = await service.listVehicles({ search: 'Civic' });
      expect(items).toHaveLength(1);
    });
  });

  describe('listPublicVehicles', () => {
    beforeEach(async () => {
      await createTestVehicle({ make: 'Toyota', isPublished: true });
      await createTestVehicle({
        make: 'Honda',
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });
      await createTestVehicle({ make: 'Kia', isPublished: false });
    });

    it('should only return published + AVAILABLE/RESERVED', async () => {
      const { items } = await service.listPublicVehicles({});
      expect(items).toHaveLength(1);
      expect(items[0].make).toBe('Toyota');
    });

    it('should not expose internal fields', async () => {
      const { items } = await service.listPublicVehicles({});
      expect(items[0].purchasePrice).toBeUndefined();
      expect(items[0].vin).toBeUndefined();
      expect(items[0].engineNumber).toBeUndefined();
    });

    it('should include public fields', async () => {
      const { items } = await service.listPublicVehicles({});
      expect(items[0].askingPrice).toBeDefined();
      expect(items[0].stockNumber).toBeDefined();
      expect(items[0].make).toBe('Toyota');
    });
  });

  describe('getVehicleById / getPublicVehicleById', () => {
    it('should return staff view with purchasePrice', async () => {
      const { vehicle } = await createTestVehicle();
      const found = await service.getVehicleById(vehicle.id);
      expect(found.purchasePrice).toBeDefined();
      expect(found.vin).toBeDefined();
    });

    it('should return public view with no purchasePrice', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const found = await service.getPublicVehicleById(vehicle.id);
      expect(found.purchasePrice).toBeUndefined();
      expect(found.askingPrice).toBeDefined();
    });

    it('should 404 if not published', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: false });
      await expect(service.getPublicVehicleById(vehicle.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should 404 if SOLD for public view', async () => {
      const { vehicle } = await createTestVehicle({
        isPublished: true,
        status: VEHICLE_STATUS.SOLD,
      });
      await expect(service.getPublicVehicleById(vehicle.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('updateVehicle', () => {
    it('should update simple fields', async () => {
      const { vehicle } = await createTestVehicle();
      const updated = await service.updateVehicle(vehicle.id, {
        askingPrice: 14000,
        color: 'Blue',
      });
      expect(updated.askingPrice).toBe(14000);
      expect(updated.color).toBe('Blue');
    });

    it('should reject VIN collision on update', async () => {
      const { vehicle: a } = await createTestVehicle({ vin: 'VIN-A' });
      const { vehicle: b } = await createTestVehicle({ vin: 'VIN-B' });
      await expect(
        service.updateVehicle(b.id, { vin: 'vin-a' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should allow keeping the same VIN', async () => {
      const { vehicle } = await createTestVehicle({ vin: 'VIN-SAME' });
      const updated = await service.updateVehicle(vehicle.id, { vin: 'vin-same' });
      expect(updated.vin).toBe('VIN-SAME');
    });

    it('should allow clearing VIN', async () => {
      const { vehicle } = await createTestVehicle({ vin: 'VIN-X' });
      const updated = await service.updateVehicle(vehicle.id, { vin: null });
      expect(updated.vin).toBeNull();
    });

    it('should 404 on unknown id', async () => {
      await expect(
        service.updateVehicle('507f1f77bcf86cd799439011', { color: 'Red' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('changeStatus', () => {
    it('should allow AVAILABLE → RESERVED', async () => {
      const { vehicle } = await createTestVehicle();
      const updated = await service.changeStatus(vehicle.id, VEHICLE_STATUS.RESERVED);
      expect(updated.status).toBe(VEHICLE_STATUS.RESERVED);
    });

    it('should allow AVAILABLE → SOLD', async () => {
      const { vehicle } = await createTestVehicle();
      const updated = await service.changeStatus(vehicle.id, VEHICLE_STATUS.SOLD);
      expect(updated.status).toBe(VEHICLE_STATUS.SOLD);
    });

    it('should forbid moving away from SOLD', async () => {
      const { vehicle } = await createTestVehicle({
        status: VEHICLE_STATUS.SOLD,
      });
      await expect(
        service.changeStatus(vehicle.id, VEHICLE_STATUS.AVAILABLE)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should allow SOLD → SOLD (idempotent)', async () => {
      const { vehicle } = await createTestVehicle({
        status: VEHICLE_STATUS.SOLD,
      });
      const updated = await service.changeStatus(vehicle.id, VEHICLE_STATUS.SOLD);
      expect(updated.status).toBe(VEHICLE_STATUS.SOLD);
    });
  });

  describe('publish/unpublish', () => {
    it('should publish a vehicle', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: false });
      const updated = await service.publishVehicle(vehicle.id);
      expect(updated.isPublished).toBe(true);
    });

    it('should unpublish a vehicle', async () => {
      const { vehicle } = await createTestVehicle({ isPublished: true });
      const updated = await service.unpublishVehicle(vehicle.id);
      expect(updated.isPublished).toBe(false);
    });
  });

  describe('deleteVehicle', () => {
    it('should delete a non-sold vehicle', async () => {
      const { vehicle } = await createTestVehicle();
      const ok = await service.deleteVehicle(vehicle.id);
      expect(ok).toBe(true);
    });

    it('should refuse to delete a SOLD vehicle', async () => {
      const { vehicle } = await createTestVehicle({
        status: VEHICLE_STATUS.SOLD,
      });
      await expect(service.deleteVehicle(vehicle.id)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should 404 on unknown id', async () => {
      await expect(
        service.deleteVehicle('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});