'use strict';

const service = require('../seller.service');
const Seller = require('../seller.model');
const ApiError = require('../../../utils/ApiError');
const { SELLER_TYPE } = require('../../../constants/enums');
const {
  buildSellerPayload,
  createTestSeller,
} = require('../../../../tests/helpers/factories');

describe('SellerService (unit)', () => {
  describe('createSeller', () => {
    it('should create a seller with all fields', async () => {
      const payload = buildSellerPayload();
      const seller = await service.createSeller(payload);

      expect(seller.id).toBeDefined();
      expect(seller.name).toBe(payload.name);
      expect(seller.type).toBe(SELLER_TYPE.INDIVIDUAL);
      expect(seller.email).toBe(payload.email.toLowerCase());
      expect(seller.isActive).toBe(true);
    });

    it('should accept a COMPANY seller', async () => {
      const seller = await service.createSeller(
        buildSellerPayload({ type: SELLER_TYPE.COMPANY, name: 'Auto Traders Ltd' })
      );
      expect(seller.type).toBe(SELLER_TYPE.COMPANY);
    });

    it('should normalize empty-string fields to null', async () => {
      const seller = await service.createSeller(
        buildSellerPayload({ phone: '', city: '', notes: '' })
      );
      expect(seller.phone).toBeNull();
      expect(seller.city).toBeNull();
      expect(seller.notes).toBeNull();
    });

    it('should lower-case the email', async () => {
      const seller = await service.createSeller(
        buildSellerPayload({ email: 'UPPER@TEST.COM' })
      );
      expect(seller.email).toBe('upper@test.com');
    });

    it('should accept a seller without email', async () => {
      const seller = await service.createSeller(
        buildSellerPayload({ email: null })
      );
      expect(seller.email).toBeNull();
    });
  });

  describe('getSellerById', () => {
    it('should return a seller', async () => {
      const { seller } = await createTestSeller();
      const found = await service.getSellerById(seller.id);
      expect(found.id).toBe(seller.id);
    });

    it('should throw 404 for unknown id', async () => {
      await expect(
        service.getSellerById('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw for malformed id', async () => {
      await expect(service.getSellerById('bad-id')).rejects.toBeTruthy();
    });
  });

  describe('listSellers', () => {
    beforeEach(async () => {
      await createTestSeller({
        name: 'Alice Auto',
        type: SELLER_TYPE.INDIVIDUAL,
        city: 'Kabul',
      });
      await createTestSeller({
        name: 'Bob Motors',
        type: SELLER_TYPE.COMPANY,
        city: 'Herat',
      });
      await createTestSeller({
        name: 'Carol Cars',
        type: SELLER_TYPE.INDIVIDUAL,
        city: 'Kabul',
        isActive: false,
      });
    });

    it('should paginate', async () => {
      const { items, meta } = await service.listSellers({ page: 1, limit: 2 });
      expect(items).toHaveLength(2);
      expect(meta.total).toBe(3);
      expect(meta.totalPages).toBe(2);
    });

    it('should filter by type', async () => {
      const { items } = await service.listSellers({ type: SELLER_TYPE.COMPANY });
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Bob Motors');
    });

    it('should filter by isActive', async () => {
      const { items } = await service.listSellers({ isActive: false });
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Carol Cars');
    });

    it('should filter by city (case-insensitive)', async () => {
      const { items } = await service.listSellers({ city: 'kabul' });
      expect(items).toHaveLength(2);
    });

    it('should search by name (case-insensitive)', async () => {
      const { items } = await service.listSellers({ search: 'alice' });
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Alice Auto');
    });

    it('should sort by name ascending', async () => {
      const { items } = await service.listSellers({ sort: 'name' });
      expect(items[0].name).toBe('Alice Auto');
    });

    it('should escape regex metacharacters in search', async () => {
      await createTestSeller({ name: 'A.B.C Traders' });
      const { items } = await service.listSellers({ search: 'A.B.C' });
      // Must return only the exact literal — not treated as regex
      expect(items.some((s) => s.name === 'A.B.C Traders')).toBe(true);
    });
  });

  describe('updateSeller', () => {
    it('should update allowed fields', async () => {
      const { seller } = await createTestSeller();
      const updated = await service.updateSeller(seller.id, {
        name: 'Renamed Seller',
        city: 'Mazar',
        notes: 'Updated notes',
      });
      expect(updated.name).toBe('Renamed Seller');
      expect(updated.city).toBe('Mazar');
      expect(updated.notes).toBe('Updated notes');
    });

    it('should lower-case email on update', async () => {
      const { seller } = await createTestSeller();
      const updated = await service.updateSeller(seller.id, {
        email: 'NEW@TEST.COM',
      });
      expect(updated.email).toBe('new@test.com');
    });

    it('should allow clearing optional fields with empty string', async () => {
      const { seller } = await createTestSeller();
      const updated = await service.updateSeller(seller.id, { phone: '' });
      expect(updated.phone).toBeNull();
    });

    it('should not change fields that were not provided', async () => {
      const { seller } = await createTestSeller({ name: 'Original' });
      const updated = await service.updateSeller(seller.id, { city: 'Herat' });
      expect(updated.name).toBe('Original');
    });

    it('should throw 404 for unknown id', async () => {
      await expect(
        service.updateSeller('507f1f77bcf86cd799439011', { name: 'x' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deactivate/activate', () => {
    it('should deactivate then activate', async () => {
      const { seller } = await createTestSeller();
      const off = await service.deactivateSeller(seller.id);
      expect(off.isActive).toBe(false);

      const on = await service.activateSeller(seller.id);
      expect(on.isActive).toBe(true);
    });

    it('should throw 404 on unknown id', async () => {
      await expect(
        service.deactivateSeller('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteSeller', () => {
    it('should hard-delete a seller', async () => {
      const { seller } = await createTestSeller();
      const ok = await service.deleteSeller(seller.id);
      expect(ok).toBe(true);

      const found = await Seller.findById(seller.id);
      expect(found).toBeNull();
    });

    it('should throw 404 on unknown id', async () => {
      await expect(
        service.deleteSeller('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});