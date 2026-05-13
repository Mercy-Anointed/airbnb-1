import { promise, property } from "zod";
import { cloudinary } from "../../config/cloudinary";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { AppError } from "../../middleware/error.middleware";
import { isPrimary } from "cluster";

// ─── Types ────────────────────────────────────────────────────────────────────
export type UploadedImage = {
    id: string;
    url: string;
    caption: string | null;
    isPrimary: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const propertyImageService = {
     // ─── Upload Single Image ──────────────────────────────────────────────────
     async uploadImage(
        propertyId: string,
        hostId: string,
        file: Express.Multer.File,
        caption?: string,
        isPrimary?: boolean 
     ): Promise<UploadedImage> {
          // Verify property exists and belongs to this host
          const property = await prisma.property.findUnique({
            where: {id: propertyId},
            select: {hostId: true, _count: {
                select: {images: true}
            }},
          });
          if (!property) throw new AppError('Property not found', 404);
          if (property.hostId !== hostId) throw new AppError('Forbidden', 403);

           // Max 20 images per property
           if (property._count.images >= 20){
            throw new AppError('Maximum of 20 images per property', 400);
           }

            // ── Upload to Cloudinary ─────────────────────────────────────────────────
    // Convert Buffer to base64 string for Cloudinary upload
    // upload_stream would be more efficient for large files
    // but base64 is simpler and fine for images under 5MB

    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: `airbnb/properties/${propertyId}`,
          // Auto-optimize: compress, convert to WebP for modern browsers
          transformation: [
            {quality: 'auto', fetch_format:'auto'},
            {width: 1920, height: 1080, crop: 'limit'}, // max resolution
          ]
    });
    logger.info(`Image uploaded to Cloudinary: ${uploadResult.secure_url}`)
     
     // If this is primary image, unset any existing primary
     if (isPrimary){
        await prisma.propertyImage.updateMany({
            where: {propertyId, isPrimary: true},
            data: {isPrimary: false}
        });
     }

       // Save image URL to database
       const image = await prisma.propertyImage.create({
        data: {
            url: uploadResult.secure_url,
            caption: caption ?? null,
            isPrimary: isPrimary ?? property._count.images === 0,
            propertyId,
        },
        select: {
            id: true,
            url: true,
            caption: true,
            isPrimary: true,
        }
       })

  return image;
},
  // ─── Upload Multiple Images ───────────────────────────────────────────────

 async uploadMultipleImages (
    propertyId: string,
    hostId: string,
    files: Express.Multer.File[],
 ): Promise<UploadedImage []>{
      // Verify ownership once
      const property = await prisma.property.findUnique({
        where: {id: propertyId},
        select: {hostId: true, 
            _count: {select: {images: true}}
        },
      });

      if (!property) throw new AppError('Property not found', 404);
      if (property.hostId !== hostId) throw new AppError('Forbidden', 403);

      const remainingSlots = 20 - property._count.images;
      if (files.length > remainingSlots){
        throw new AppError(`Can only upload ${remainingSlots} more images for this property`, 400);

      }
      // Upload all images in parallel — faster than sequential
      const uploadPromises = files.map((file, index) => 
        this.uploadImage(
        propertyId,
        hostId,
        file,
        undefined, 
        index === 0 && property._count.images === 0, // first image is primary
      ))
 return Promise.all(uploadPromises);
},
  // ─── Delete Image ─────────────────────────────────────────────────────────
  async deleteImage(
    imageId: string,
    hostId: string,

  ): Promise<{message: string}>{
    const image = await prisma.propertyImage.findUnique({
        where: {id: imageId},
        include: {
            property: {select: {hostId: true}}
        }
    });

    if (!image) throw new AppError("Image not found", 404);
    if (image.property.hostId !== hostId) throw new AppError("Forbidden", 403);

     // Extract public_id from Cloudinary URL to delete from Cloudinary
    // URL format: https://res.cloudinary.com/cloud/image/upload/v123/folder/public_id.ext
    const urlParts = image.url.split('/');
    const publicIdWithExtension = urlParts.slice(-2).join('/')
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ""); // remove file extension

     // Delete from Cloudinary
     await cloudinary.uploader.destroy(publicId);

      // Delete from database
      await prisma.propertyImage.delete({
        where: {id: imageId}
      });


    // If deleted image was primary — make next image primary
    if (image.isPrimary){
        const nextImage = await prisma.propertyImage.findFirst({
            where: {propertyId: image.propertyId},
            orderBy: {id: 'asc'}
        });
        if (nextImage){
            await prisma.propertyImage.update({
                where: {id: nextImage.id},
                data: {isPrimary: true},
            })
        }
    };
    return {message: "Image deleted successfully"}
  },
   // ─── Get Property Images ──────────────────────────────────────────────────
   async getPropertyImages(propertyId: string): Promise<UploadedImage[]>{
    return prisma.propertyImage.findMany({
        where: {propertyId},
        select: {
            id: true,
            url: true,
            caption: true,
            isPrimary: true,
        },
        orderBy: {isPrimary: 'desc'}
    })
   },
     // ─── Set Primary Image ────────────────────────────────────────────────────
     async setPrimaryImage(
        imageId: string,
        propertyId: string,
        hostId: string,

     ): Promise<UploadedImage>{
        const property = await prisma.property.findUnique({
            where: {id: propertyId},
            select: {hostId: true}
        });

        if (!property) throw new AppError("Property not found ", 404);
        if (property.hostId !== hostId) throw new AppError("Forbidden", 403);

         // Unset current primary
         await prisma.propertyImage.updateMany({
            where: {propertyId, isPrimary: true},
            data: {isPrimary: false},
         });

          // Set new primary
          return prisma.propertyImage.update({
            where: {id: imageId},
            data: {isPrimary: true},
            select: {
                id: true,
                url: true,
                caption: true,
                isPrimary: true,
            }
          })
     }
 };
