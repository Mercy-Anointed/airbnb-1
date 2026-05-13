import { ApiResponse } from "../../lib/api-response";
import { AppError } from "../../middleware/error.middleware"
import { propertyImageService } from "./property-image.service";
import { Request, Response } from "express";

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const propertyId = Array.isArray(req.params.propertyId) ? req.params.propertyId[0] : req.params.propertyId;
    const hostId = req.user!.userId; 
    const {caption, isPrimary} = req.body;

    const image = await propertyImageService.uploadImage(
        propertyId,
        hostId,
        req.file,
        caption,
        isPrimary === 'true'  );

        ApiResponse.created(res, image)
};

export const uploadMultipleImages = async (req: Request, res: Response): Promise<void>=> {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0 ) {
        throw new AppError('No files uploaded', 400);
    }

    const propertyId = Array.isArray(req.params.propertyId) ? req.params.propertyId[0] : req.params.propertyId;
    const hostId = req.user!.userId;

    const images = await propertyImageService.uploadMultipleImages(
        propertyId,
        hostId,
        req.files 
    );
    ApiResponse.created(res, images);
};

export const deleteImage = async (req: Request, res: Response): Promise<void> => {
    const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;
    const hostId = req.user!.userId;
    const result = await propertyImageService.deleteImage(imageId, hostId);
    ApiResponse.success(res, result);
}

export const getPropertyImages = async(req: Request, res: Response): Promise<void> => {
    const propertyId = Array.isArray(req.params.propertyId) ? req.params.propertyId[0] : req.params.propertyId;
    const images = await propertyImageService.getPropertyImages(propertyId);
    ApiResponse.success(res, images);
}

export const setPrimaryImage = async(req: Request, res: Response): Promise<void> => {
    const propertyId = Array.isArray(req.params.propertyId) ? req.params.propertyId[0] : req.params.propertyId;
    const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;
    const hostId = req.user!.userId;
    const image = await propertyImageService.setPrimaryImage(
        imageId,
        propertyId,
        hostId
    );
    ApiResponse.success(res, image);
}