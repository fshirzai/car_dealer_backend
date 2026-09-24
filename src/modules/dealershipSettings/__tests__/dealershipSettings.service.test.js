'use strict';

const service = require('../dealershipSettings.service');
const DealershipSettings = require('../dealershipSettings.model');
const {
  buildDealershipSettingsPayload,
} = require('../../../../tests/helpers/factories');
const { SINGLETON_ID } = require('../dealershipSettings.constants');

describe('DealershipSettingsService (unit)', () => {
  describe('getSettings', () => {
    it('should return null when no settings exist', async () => {
      const settings = await service.getSettings();
      expect(settings).toBeNull();
    });

    it('should return settings when present', async () => {
      await DealershipSettings.create({
        _id: SINGLETON_ID,
        ...buildDealershipSettingsPayload(),
      });
      const settings = await service.getSettings();
      expect(settings).not.toBeNull();
      expect(settings.id).toBe(SINGLETON_ID);
    });
  });

  describe('getPublicSettings', () => {
    it('should return null when unset', async () => {
      const pub = await service.getPublicSettings();
      expect(pub).toBeNull();
    });

    it('should expose only public fields', async () => {
      await DealershipSettings.create({
        _id: SINGLETON_ID,
        ...buildDealershipSettingsPayload(),
      });
      const pub = await service.getPublicSettings();
      expect(pub.businessName).toBeDefined();
      expect(pub.legalName).toBeUndefined(); // not public
    });
  });

  describe('getOrCreate', () => {
    it('should create default settings when none exist', async () => {
      const settings = await service.getOrCreate();
      expect(settings).not.toBeNull();
      expect(settings.id).toBe(SINGLETON_ID);
      expect(settings.businessName).toBe('My Dealership');
    });

    it('should be idempotent', async () => {
      const first = await service.getOrCreate();
      const second = await service.getOrCreate();
      expect(second.id).toBe(first.id);
      const count = await DealershipSettings.countDocuments();
      expect(count).toBe(1);
    });
  });

  describe('upsertSettings', () => {
    it('should create settings when none exist', async () => {
      const payload = buildDealershipSettingsPayload();
      const settings = await service.upsertSettings(payload);
      expect(settings.id).toBe(SINGLETON_ID);
      expect(settings.businessName).toBe(payload.businessName);
    });

    it('should update when already exists (still 1 doc)', async () => {
      await service.upsertSettings(buildDealershipSettingsPayload());
      const updated = await service.upsertSettings(
        buildDealershipSettingsPayload({ businessName: 'Updated Name' })
      );
      expect(updated.businessName).toBe('Updated Name');
      const count = await DealershipSettings.countDocuments();
      expect(count).toBe(1);
    });

    it('should lowercase email', async () => {
      const settings = await service.upsertSettings(
        buildDealershipSettingsPayload({ email: 'UPPER@TEST.COM' })
      );
      expect(settings.email).toBe('upper@test.com');
    });

    it('should normalize empty optional fields to null', async () => {
      const settings = await service.upsertSettings(
        buildDealershipSettingsPayload({
          phone: '',
          city: '',
          legalName: '',
        })
      );
      expect(settings.phone).toBeNull();
      expect(settings.city).toBeNull();
      expect(settings.legalName).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update individual fields', async () => {
      await DealershipSettings.create({
        _id: SINGLETON_ID,
        ...buildDealershipSettingsPayload(),
      });
      const updated = await service.updateSettings({
        businessName: 'Renamed Motors',
      });
      expect(updated.businessName).toBe('Renamed Motors');
    });

    it('should throw 404 if settings not created yet', async () => {
      await expect(
        service.updateSettings({ businessName: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});