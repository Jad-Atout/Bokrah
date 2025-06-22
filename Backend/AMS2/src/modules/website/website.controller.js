import Client from '../../../DB/models/client.js';
import Website from '../../../DB/models/website.js';
import Availability from '../../../DB/models/availability.js';
import BookingSettings from '../../../DB/models/bookingSettings.js';
import { generateWebsiteUrl } from '../../utils/websiteUtils.js';
import mongoose from 'mongoose';

export const createClientWebsite = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { customWebsiteName } = req.body;
        

        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }

        let website = await Website.findOne({ clientId });
        
        if (!website) {
            const availability = new Availability();
            website = await Website.create({ clientId,availability_id:availability._id });
        }

        const websiteName = customWebsiteName || website.businessName;
        if (!websiteName) {
            return res.status(400).json({ message: "Business name is required" });
        }

        const { fullUrl, websitePath } = generateWebsiteUrl(client, websiteName);

        client.customWebsiteName = websiteName;
        client.website = fullUrl;
        await client.save();

        res.status(200).json({
            message: "Website created successfully",
            websiteUrl: fullUrl,
            websitePath: websitePath,
            customWebsiteName: websiteName,
            businessName: website.businessName
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getClientWebsite = async (req, res) => {
    try {
        const { websiteUrl } = req.params;

        // First, let's check what's in the database
        const allClients = await Client.find({}, 'website customWebsiteName');

        // Extract the custom name from the URL (everything before the first hyphen)
        const customName = websiteUrl.split('-')[0];

        // Search for the client using the custom name
        const client = await Client.findOne({ customWebsiteName: customName });
        
        if (!client) {
            return res.status(404).json({
                message: "Website not found",
                searchedName: customName,
                availableUrls: allClients.map(c => c.website).filter(Boolean)
            });
        }

        // Get the website details
        const website = await Website.findOne({ clientId: client._id });

        res.status(200).json({
            client,
            website,
            websiteUrl: client.website,
            customWebsiteName: client.customWebsiteName,
            businessName: website?.businessName
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getClientWebsiteById = async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await Client.findById(clientId)
      .populate({
        path: 'userId',
        select: 'userName email phoneNumber confirmed'
      })
      .select('about city address website customWebsiteName');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const website = await Website.findOne({ clientId });
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Fetch booking settings for the client
    const bookingSettings = await BookingSettings.findOne({ clientId });

    // 3. Find Availability by website._id
    const availability = await Availability.findOne({ websiteId: website._id });

    // If no Availability, use defaults or return empty
    let workingHours;
    if (!availability) {
      // Provide default or empty structure
      workingHours = {
        timeZone: 'Asia/Gaza', // or any default
        workingDays: [
          { day: 'Monday', slots: [] },
          { day: 'Tuesday', slots: [] },
          { day: 'Wednesday', slots: [] },
          { day: 'Thursday', slots: [] },
          { day: 'Friday', slots: [] },
          { day: 'Saturday', slots: [] },
          { day: 'Sunday', slots: [] }
        ]
      };
    } else {
      workingHours = {
        timeZone: availability.timeZone,
        workingDays: availability.availability // Array of {day, slots:[{startTime,endTime}]}
      };
    }

    // 4. Format final response
    const response = {
      client: {
        id: client._id,
        businessName: website.businessName,
        industry: website.industry,
        website: client.website,
        customWebsiteName: client.customWebsiteName,
        websiteUrls: website.websiteUrls || [],
        about: client.about,
        city: client.city,
        address: client.address,
        instagramUrl: website.instagramUrl,
        facebookUrl: website.facebookUrl,
        logo: website.logo,
        user: {
          userName: client.userId.userName,
          email: client.userId.email,
          phoneNumber: client.userId.phoneNumber,
          confirmed: client.userId.confirmed
        }
      },
      workingHours,
      bookingPolicy: bookingSettings?.bookingPolicy || null
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getClientWebsiteById:', error);
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------------
// PUT: updateClientWebsite
// -----------------------------------
export const updateClientWebsite = async (req, res) => {
  try {
    const { clientId } = req.authUser; 
    const {
      businessName,
      industry,
      websiteUrls,
      about,
      city,
      address,
      instagramUrl,
      facebookUrl,
      userName,
      phoneNumber,
      timeZone,
      workingDays,
      customWebsiteName 
    } = req.body;

    const client = await Client.findById(clientId).populate('userId');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (userName || phoneNumber) {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(client.userId._id, {
        $set: {
          ...(userName && { userName }),
          ...(phoneNumber && { phoneNumber })
        }
      });
    }

    if (customWebsiteName) {
   
        const { fullUrl, websitePath } = generateWebsiteUrl(client, customWebsiteName);
      
      client.customWebsiteName = customWebsiteName;
      client.website = fullUrl;
      await client.save();
    }

    client.about = about;
    client.city = city;
    client.address = address;
    await client.save();

    const website = await Website.findOne({ clientId });
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }



    let parsedWorkingDays = [];
    try {
      if (typeof workingDays === 'string') {
        parsedWorkingDays = JSON.parse(workingDays);
      } else if (Array.isArray(workingDays)) {
        parsedWorkingDays = workingDays;
      }
    } catch (err) {
      console.error('Error parsing workingDays:', err);
    }

    const formattedAvailability = (parsedWorkingDays || []).map((day) => ({
      day: day.name,
      slots: day.isDayOff
        ? []
        : day.slots.map((slot) => ({
            startTime: slot.start,
            endTime: slot.end
          }))
    }));

    let availability = await Availability.findOne({_id:website.availability_id});
    if (!availability) {
      availability = new Availability({
        timeZone: timeZone || 'Asia/Gaza',
        availability: formattedAvailability
      });
    } else {
      availability.timeZone = timeZone || availability.timeZone;
      availability.availability = formattedAvailability;
    }
    await availability.save();
      if (req.file) {
          website.logo = {
              url: req.file.path,
              publicId: req.file.filename
          };
      }

      website.businessName = businessName;
      website.industry = industry;
      website.websiteUrls = websiteUrls;
      website.instagramUrl = instagramUrl;
      website.facebookUrl = facebookUrl;
      await website.save();

    const updatedClient = await Client.findById(clientId)
      .populate({
        path: 'userId',
        select: 'userName email phoneNumber confirmed'
      })
      .select('about city address website customWebsiteName');

    const updatedWebsite = await Website.findOne({ clientId });
    const updatedAvailability = await Availability.findOne({
      _id: updatedWebsite.availability_id
    });

    res.status(200).json({
      message: 'Website updated successfully',
      client: {
        id: updatedClient._id,
        businessName: updatedWebsite.businessName,
        industry: updatedWebsite.industry,
        website: updatedClient.website,
        websiteUrls: updatedWebsite.websiteUrls,
        about: updatedClient.about,
        city: updatedClient.city,
        address: updatedClient.address,
        instagramUrl: updatedWebsite.instagramUrl,
        facebookUrl: updatedWebsite.facebookUrl,
        logo: updatedWebsite.logo,
        customWebsiteName: updatedClient.customWebsiteName,
        user: {
          userName: updatedClient.userId.userName,
          email: updatedClient.userId.email,
          phoneNumber: updatedClient.userId.phoneNumber,
          confirmed: updatedClient.userId.confirmed
        }
      },
      workingHours: {
        timeZone: updatedAvailability.timeZone,
        workingDays: updatedAvailability.availability
      }
    });
  } catch (error) {
    console.error('Error in updateClientWebsite:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateWorkingHours = async (req, res) => {
    try {
        const { clientId } = req.authUser; 
        const { timeZone, workingDays } = req.body;

        const website = await Website.findOne({ clientId });
        if (!website) {
            return res.status(404).json({ message: "Website not found" });
        }

        const formattedAvailability = workingDays.map(day => ({
            day: day.name,
            slots: day.isDayOff ? [] : day.slots.map(slot => ({
                startTime: slot.start,
                endTime: slot.end
            }))
        }));

        let availability = await Availability.findOne({ websiteId: website._id });
        if (!availability) {
            availability = new Availability({
                websiteId: website._id,
                timeZone,
                availability: formattedAvailability
            });
        } else {
            availability.timeZone = timeZone;
            availability.availability = formattedAvailability;
        }
        await availability.save();

        res.status(200).json({
            message: "Working hours updated successfully",
            workingHours: {
                timeZone: availability.timeZone,
                workingDays: availability.availability
            }
        });
    } catch (error) {
        console.error('Error in updateWorkingHours:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getWorkingHours = async (req, res) => {
    try {
        const { clientId } = req.params;

        const website = await Website.findOne({ clientId });
        if (!website) {
            return res.status(404).json({ message: "Website not found" });
        }

        const availability = await Availability.findOne({ websiteId: website._id });
        if (!availability) {
            return res.status(200).json({
                workingHours: {
                    timeZone: "Asia/Gaza",
                    workingDays: [
                        {
                            day: "Monday",
                            slots: [{ startTime: "08:00 AM", endTime: "04:00 PM" }]
                        },
                        {
                            day: "Tuesday",
                            slots: [{ startTime: "08:00 AM", endTime: "04:00 PM" }]
                        },
                        {
                            day: "Wednesday",
                            slots: [{ startTime: "08:00 AM", endTime: "04:00 PM" }]
                        },
                        {
                            day: "Thursday",
                            slots: [{ startTime: "08:00 AM", endTime: "04:00 PM" }]
                        },
                        {
                            day: "Friday",
                            slots: []
                        },
                        {
                            day: "Saturday",
                            slots: []
                        },
                        {
                            day: "Sunday",
                            slots: [{ startTime: "08:00 AM", endTime: "04:00 PM" }]
                        }
                    ]
                }
            });
        }

        res.status(200).json({
            workingHours: {
                timeZone: availability.timeZone,
                workingDays: availability.availability
            }
        });
    } catch (error) {
        console.error('Error in getWorkingHours:', error);
        res.status(500).json({ message: error.message });
    }
};
