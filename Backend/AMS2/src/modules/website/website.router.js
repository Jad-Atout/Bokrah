import express from 'express';
import upload from "../../utils/multer.js";
import { 
    createClientWebsite, 
    getClientWebsite, 
    getClientWebsiteById, 
    updateClientWebsite,
    updateWorkingHours,
    getWorkingHours
} from './website.controller.js';
import {auth,roles} from "../../middleware/auth.js"


const router = express.Router();

router.post('/client/:clientId', createClientWebsite);

router.get('/:websiteUrl', getClientWebsite);

router.get('/client/:clientId', getClientWebsiteById);

// Update routes to use authenticated user
router.put('/client/:clientId', auth(roles.Client), upload.single('logo'), updateClientWebsite);
router.get('/working-hours', getWorkingHours);
router.put('/working-hours', auth(roles.Client), updateWorkingHours);

// File upload route
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Invalid file format" });
    }
    res.status(200).json({
        message: "File uploaded successfully",
        fileUrl: req.file.path, // Cloudinary file URL
    });
});

export default router;