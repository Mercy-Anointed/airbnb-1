import { env } from "./env";
import { v2 as cloudinary } from "cloudinary";
// Configure Cloudinary with credentials from env
// Called once at startup — all uploads use this config
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true, // always use HTTPS URLs

})

export {cloudinary};