import express from 'express';
import upload from "../../utils/multer.js";
const router = express.Router();

router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Invalid file format" });
    }
    res.status(200).json({
        message: "File uploaded successfully",
        fileUrl: req.file.path, // Cloudinary file URL
    });
});

export default router;