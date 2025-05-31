import Subscription from "../../../DB/models/subscription.js";
import User from "../../../DB/models/user.js";
import Website from "../../../DB/models/website.js";

// Get all clients with their subscription info
export const getAllClientsWithSubscription = async (req, res) => {
  try {
    // Get all clients and their user info
    const clients = await (await import("../../../DB/models/client.js")).default.find()
      .populate({
        path: "userId",
        select: "userName email"
      })
      .lean();

    // Get all subscriptions, indexed by userId
    const subscriptions = await Subscription.find().lean();
    const subMap = {};
    subscriptions.forEach(sub => {
      if (sub.user) subMap[sub.user.toString()] = sub;
    });

    // For each client, attach subscription info or default to Free
    const result = clients.map(client => {
      const userId = client.userId?._id?.toString() || client.userId?.toString();
      const userInfo = client.userId || {};
      const sub = subMap[userId];
      return {
        name: userInfo.userName || "",
        email: userInfo.email || "",
        plan: sub ? sub.plan : "Free",
        status: sub ? sub.status : "Active",
        renewalDate: sub ? sub.renewalDate : null,
      };
    });

    res.status(200).json({ clients: result });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Admin dashboard statistics
import Appointment from "../../../DB/models/appointment.js";
import Client from "../../../DB/models/client.js";
import Service from "../../../DB/models/service.js";
import AppointmentService from "../../../DB/models/AppointmentService.js";

export const getAdminDashboardStats = async (req, res) => {



  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // Appointments by status
    const appointmentStatuses = ["Booked", "completed", "Cancelled"];
    const appointmentCounts = {};
    for (const status of appointmentStatuses) {
      appointmentCounts[status] = await Appointment.countDocuments({ status });
    }

    // All Premium Clients
    const premiumSubs = await Subscription.find({ plan: "Premium" }).populate({ path: "user", select: "userName email" });
    const premiumClients = premiumSubs.map(sub => ({
      name: sub.user?.userName || "",
      email: sub.user?.email || "",
      plan: sub.plan,
      status: sub.status,
      renewalDate: sub.renewalDate,
    }));

    // Total Revenue (sum of price for completed appointments)
    // Find all completed appointments
    const completedAppointments = await Appointment.find({ status: "completed" }).lean();
    const completedAppointmentIds = completedAppointments.map(app => app._id);
    // Find all AppointmentService docs for completed appointments
    const appointmentServices = await AppointmentService.find({ appointmentId: { $in: completedAppointmentIds } }).lean();
    const serviceIds = appointmentServices.map(as => as.serviceId);
    // Find all services and sum their prices
    const services = await Service.find({ _id: { $in: serviceIds } }).lean();
    const totalRevenue = services.reduce((sum, s) => sum + (s.price || 0), 0);

    res.status(200).json({
      totalUsers,
      appointments: appointmentCounts,
      premiumClients,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// Get sum of appointments per month
export const getMonthlyAppointmentSums = async (req, res) => {
  try {
    // Unwind subAppointments, then group by year/month of subAppointment.startTime
    const data = await Appointment.aggregate([
      { $unwind: "$subAppointments" },
      {
        $group: {
          _id: {
            year: { $year: "$subAppointments.startTime" },
            month: { $month: "$subAppointments.startTime" }
          },
          num: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const result = data.map(item => ({
      year: item._id.year,
      month: item._id.month,
      num: item.num
    }));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all unique industries for charting
export const getAllIndustries = async (req, res) => {
  try {
    // Aggregate to get unique industries and their counts
    const data = await Website.aggregate([
      { $match: { industry: { $ne: null, $ne: "" } } },
      { $group: { _id: "$industry", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    // Format output
    const result = data.map(item => ({ industry: item._id, count: item.count }));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};