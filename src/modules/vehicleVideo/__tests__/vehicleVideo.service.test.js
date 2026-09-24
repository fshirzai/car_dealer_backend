'use strict';

const service = require('../vehicleVideo.service');
const VehicleVideo = require('../vehicleVideo.model');
const { createTestVehicle } = require('../../../../tests/helpers/factories');

describe('VehicleVideoService (unit)', () => {
  describe('upsertVideo', () => {
    it('should create a video when none exists', async () => {
      const { vehicle } = await createTestVehicle();
      const video = await service.upsertVideo(vehicle.id, {
        url: 'https://videos.example.com/walkthrough.mp4',
        title: 'Walk-around',
      });
      expect(video.id).toBeDefined();
      expect(video.vehicleId.toString()).toBe(vehicle.id);
      expect(video.title).toBe('Walk-around');
    });

    it('should update the video when one exists (unique per vehicle)', async () => {
      const { vehicle } = await createTestVehicle();
      const first = await service.upsertVideo(vehicle.id, {
        url: 'https://videos.example.com/a.mp4',
      });
      const second = await service.upsertVideo(vehicle.id, {
        url: 'https://videos.example.com/b.mp4',
        title: 'New Title',
      });

      // Same _id => updated, not duplicated
      expect(second.id).toBe(first.id);
      expect(second.url).toBe('https://videos.example.com/b.mp4');
      expect(second.title).toBe('New Title');

      const count = await VehicleVideo.countDocuments({ vehicleId: vehicle.id });
      expect(count).toBe(1);
    });

    it('should 404 for unknown vehicle', async () => {
      await expect(
        service.upsertVideo('507f1f77bcf86cd799439011', {
          url: 'https://videos.example.com/a.mp4',
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getByVehicle', () => {
    it('should return null if no video', async () => {
      const { vehicle } = await createTestVehicle();
      const video = await service.getByVehicle(vehicle.id);
      expect(video).toBeNull();
    });

    it('should return the video if present', async () => {
      const { vehicle } = await createTestVehicle();
      await service.upsertVideo(vehicle.id, { url: 'https://videos.example.com/a.mp4' });
      const video = await service.getByVehicle(vehicle.id);
      expect(video).not.toBeNull();
      expect(video.vehicleId.toString()).toBe(vehicle.id);
    });
  });

  describe('updateVideo', () => {
    it('should update fields', async () => {
      const { vehicle } = await createTestVehicle();
      await service.upsertVideo(vehicle.id, { url: 'https://videos.example.com/a.mp4' });
      const updated = await service.updateVideo(vehicle.id, {
        title: 'Updated',
        thumbnailUrl: 'https://cdn.example.com/t.jpg',
      });
      expect(updated.title).toBe('Updated');
      expect(updated.thumbnailUrl).toBe('https://cdn.example.com/t.jpg');
    });

    it('should 404 if no video exists', async () => {
      const { vehicle } = await createTestVehicle();
      await expect(
        service.updateVideo(vehicle.id, { title: 'x' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteVideo', () => {
    it('should delete the video', async () => {
      const { vehicle } = await createTestVehicle();
      await service.upsertVideo(vehicle.id, { url: 'https://videos.example.com/a.mp4' });
      const ok = await service.deleteVideo(vehicle.id);
      expect(ok).toBe(true);
      const remaining = await VehicleVideo.findOne({ vehicleId: vehicle.id });
      expect(remaining).toBeNull();
    });

    it('should 404 if no video exists', async () => {
      const { vehicle } = await createTestVehicle();
      await expect(service.deleteVideo(vehicle.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});