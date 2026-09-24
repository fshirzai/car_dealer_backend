'use strict';

const service = require('../vehicleImage.service');
const VehicleImage = require('../vehicleImage.model');
const { createTestVehicle } = require('../../../../tests/helpers/factories');

describe('VehicleImageService (unit)', () => {
  describe('createImage', () => {
    it('should create an image and mark the FIRST one primary', async () => {
      const { vehicle } = await createTestVehicle();
      const image = await service.createImage(vehicle.id, {
        url: 'https://cdn.example.com/a.jpg',
      });
      expect(image.isPrimary).toBe(true);
      expect(image.vehicleId.toString()).toBe(vehicle.id);
      expect(image.sortOrder).toBe(0);
    });

    it('should NOT make subsequent images primary by default', async () => {
      const { vehicle } = await createTestVehicle();
      await service.createImage(vehicle.id, { url: 'https://x.com/1.jpg' });
      const second = await service.createImage(vehicle.id, {
        url: 'https://x.com/2.jpg',
      });
      expect(second.isPrimary).toBe(false);
      expect(second.sortOrder).toBe(1);
    });

    it('should demote existing primary when creating with isPrimary=true', async () => {
      const { vehicle } = await createTestVehicle();
      const first = await service.createImage(vehicle.id, {
        url: 'https://x.com/1.jpg',
      });
      const second = await service.createImage(vehicle.id, {
        url: 'https://x.com/2.jpg',
        isPrimary: true,
      });

      const firstReloaded = await VehicleImage.findById(first.id);
      expect(firstReloaded.isPrimary).toBe(false);
      expect(second.isPrimary).toBe(true);
    });

    it('should 404 for unknown vehicle', async () => {
      await expect(
        service.createImage('507f1f77bcf86cd799439011', {
          url: 'https://x.com/1.jpg',
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should respect explicit sortOrder', async () => {
      const { vehicle } = await createTestVehicle();
      const img = await service.createImage(vehicle.id, {
        url: 'https://x.com/1.jpg',
        sortOrder: 5,
      });
      expect(img.sortOrder).toBe(5);
    });
  });

  describe('bulkCreateImages', () => {
    it('should create multiple images and set first as primary', async () => {
      const { vehicle } = await createTestVehicle();
      const images = await service.bulkCreateImages(vehicle.id, [
        { url: 'https://x.com/1.jpg' },
        { url: 'https://x.com/2.jpg' },
        { url: 'https://x.com/3.jpg' },
      ]);

      expect(images).toHaveLength(3);
      expect(images[0].isPrimary).toBe(true);
      expect(images[1].isPrimary).toBe(false);
      expect(images[2].isPrimary).toBe(false);
      expect(images[0].sortOrder).toBe(0);
      expect(images[2].sortOrder).toBe(2);
    });

    it('should NOT mark new images primary if one already exists', async () => {
      const { vehicle } = await createTestVehicle();
      await service.createImage(vehicle.id, { url: 'https://x.com/existing.jpg' });

      const more = await service.bulkCreateImages(vehicle.id, [
        { url: 'https://x.com/new1.jpg' },
        { url: 'https://x.com/new2.jpg' },
      ]);
      expect(more.every((i) => i.isPrimary === false)).toBe(true);
    });

    it('should 404 for unknown vehicle', async () => {
      await expect(
        service.bulkCreateImages('507f1f77bcf86cd799439011', [
          { url: 'https://x.com/1.jpg' },
        ])
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('listByVehicle', () => {
    it('should list images sorted by sortOrder', async () => {
      const { vehicle } = await createTestVehicle();
      await service.createImage(vehicle.id, {
        url: 'https://x.com/b.jpg',
        sortOrder: 2,
      });
      await service.createImage(vehicle.id, {
        url: 'https://x.com/a.jpg',
        sortOrder: 1,
      });

      const list = await service.listByVehicle(vehicle.id);
      expect(list[0].sortOrder).toBe(1);
      expect(list[1].sortOrder).toBe(2);
    });
  });

  describe('setPrimary', () => {
    it('should atomically swap primary', async () => {
      const { vehicle } = await createTestVehicle();
      const a = await service.createImage(vehicle.id, { url: 'https://x.com/a.jpg' });
      const b = await service.createImage(vehicle.id, { url: 'https://x.com/b.jpg' });

      await service.setPrimary(b.id);

      const aReloaded = await VehicleImage.findById(a.id);
      const bReloaded = await VehicleImage.findById(b.id);
      expect(aReloaded.isPrimary).toBe(false);
      expect(bReloaded.isPrimary).toBe(true);
    });

    it('should be idempotent if already primary', async () => {
      const { vehicle } = await createTestVehicle();
      const a = await service.createImage(vehicle.id, { url: 'https://x.com/a.jpg' });
      const b = await service.createImage(vehicle.id, { url: 'https://x.com/b.jpg' });

      await service.setPrimary(a.id); // a is already primary
      const aReloaded = await VehicleImage.findById(a.id);
      const bReloaded = await VehicleImage.findById(b.id);
      expect(aReloaded.isPrimary).toBe(true);
      expect(bReloaded.isPrimary).toBe(false);
    });
  });

  describe('reorderImages', () => {
    it('should update sortOrder according to given order', async () => {
      const { vehicle } = await createTestVehicle();
      const a = await service.createImage(vehicle.id, { url: 'https://x.com/a.jpg' });
      const b = await service.createImage(vehicle.id, { url: 'https://x.com/b.jpg' });
      const c = await service.createImage(vehicle.id, { url: 'https://x.com/c.jpg' });

      await service.reorderImages(vehicle.id, [c.id, a.id, b.id]);

      const list = await service.listByVehicle(vehicle.id);
      expect(list.map((i) => i.id)).toEqual([c.id, a.id, b.id]);
    });

    it('should reject foreign image ids', async () => {
      const { vehicle: v1 } = await createTestVehicle();
      const { vehicle: v2 } = await createTestVehicle();
      const a = await service.createImage(v1.id, { url: 'https://x.com/a.jpg' });
      const foreign = await service.createImage(v2.id, { url: 'https://x.com/f.jpg' });

      await expect(
        service.reorderImages(v1.id, [a.id, foreign.id])
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('deleteImage', () => {
    it('should delete an image', async () => {
      const { vehicle } = await createTestVehicle();
      const img = await service.createImage(vehicle.id, { url: 'https://x.com/a.jpg' });
      const ok = await service.deleteImage(img.id);
      expect(ok).toBe(true);
      const found = await VehicleImage.findById(img.id);
      expect(found).toBeNull();
    });

    it('should promote next image when primary is deleted', async () => {
      const { vehicle } = await createTestVehicle();
      const a = await service.createImage(vehicle.id, { url: 'https://x.com/a.jpg' });
      const b = await service.createImage(vehicle.id, { url: 'https://x.com/b.jpg' });

      await service.deleteImage(a.id);

      const bReloaded = await VehicleImage.findById(b.id);
      expect(bReloaded.isPrimary).toBe(true);
    });

    it('should NOT change primary when a non-primary is deleted', async () => {
      const { vehicle } = await createTestVehicle();
      const a = await service.createImage(vehicle.id, { url: 'https://x.com/a.jpg' });
      const b = await service.createImage(vehicle.id, { url: 'https://x.com/b.jpg' });

      await service.deleteImage(b.id);

      const aReloaded = await VehicleImage.findById(a.id);
      expect(aReloaded.isPrimary).toBe(true);
    });

    it('should 404 for unknown id', async () => {
      await expect(
        service.deleteImage('507f1f77bcf86cd799439011')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteByVehicle', () => {
    it('should delete all images for a vehicle', async () => {
      const { vehicle } = await createTestVehicle();
      await service.createImage(vehicle.id, { url: 'https://x.com/1.jpg' });
      await service.createImage(vehicle.id, { url: 'https://x.com/2.jpg' });

      const count = await service.deleteByVehicle(vehicle.id);
      expect(count).toBe(2);
      const remaining = await VehicleImage.find({ vehicleId: vehicle.id });
      expect(remaining).toHaveLength(0);
    });
  });
});