import multer from 'multer';
import cloudinary from "./cloudinary.js";
import { CloudinaryStorage } from 'multer-storage-cloudinary';

export const fileType = {
    image: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
    pdf: ['application/pdf']
};

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "uploads", // Cloudinary folder
        format: file.originalname.split('.').pop(), // Extract file extension
        public_id: file.originalname.split('.')[0] // Use filename as public_id
    })
});

function fileFilter(req, file, cb) {
    const allowedTypes = [...fileType.image, ...fileType.pdf];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false); // Reject file without error
    }
}

const upload = multer({ storage, fileFilter });

export default upload;
