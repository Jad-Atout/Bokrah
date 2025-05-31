import express from "express";
import {
  getAllClientsWithSubscription,
  getAdminDashboardStats,
  getMonthlyAppointmentSums,
  getAllIndustries
} from "./admin.controller.js";

const router = express.Router();

// Route: Get all clients with subscription info
router.get("/clients", getAllClientsWithSubscription);

// Route: Get admin dashboard statistics
router.get("/dashboard-stats", getAdminDashboardStats);

// Route: Get monthly appointment sums
router.get("/appointments/monthly-sum", getMonthlyAppointmentSums);

// Route: Get all industries
router.get("/industries", getAllIndustries);

export default router;
