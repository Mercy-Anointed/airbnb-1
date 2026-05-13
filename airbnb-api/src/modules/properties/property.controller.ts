import { Request, Response } from 'express';
import { propertyService } from './property.service';
import { ApiResponse } from '../../lib/api-response';
import { PropertyQuery, PropertyParams } from './property.schema';

// ─── Get All Properties ───────────────────────────────────────────────────────
export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = req.query as unknown as PropertyQuery;
  const result = await propertyService.getProperties(query);
  ApiResponse.success(res, result);
};

// ─── Get Single Property ──────────────────────────────────────────────────────
export const getPropertyById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as PropertyParams;
  const property = await propertyService.getPropertyById(id);
  ApiResponse.success(res, property);
};

// ─── Create Property ──────────────────────────────────────────────────────────
// hostId comes from req.user after auth middleware (Week 4)
// For now we use a placeholder until auth is implemented
export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  // TODO: replace with req.user.id after auth is implemented in Week 4
  const hostId = req.user!.userId
  const property = await propertyService.createProperty(hostId, req.body);
  ApiResponse.created(res, property);
};

// ─── Update Property ──────────────────────────────────────────────────────────
export const updateProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as PropertyParams;
  // TODO: replace with req.user.id after auth is implemented in Week 4
  const hostId = req.user!.userId
  const property = await propertyService.updateProperty(id, hostId, req.body);
  ApiResponse.success(res, property);
};

// ─── Delete Property ──────────────────────────────────────────────────────────
export const deleteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as PropertyParams;
  // TODO: replace with req.user.id after auth is implemented in Week 4
  const hostId = req.user!.userId
  const result = await propertyService.deleteProperty(id, hostId);
  ApiResponse.success(res, result);
};

// ─── Get Host Properties ──────────────────────────────────────────────────────
export const getHostProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id: hostId } = req.params as PropertyParams;
  const properties = await propertyService.getHostProperties(hostId);
  ApiResponse.success(res, properties);
};