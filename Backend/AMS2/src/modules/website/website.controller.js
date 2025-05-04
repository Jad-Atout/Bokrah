import Client from '../../../DB/models/client.js';
import Website from '../../../DB/models/website.js';
import { generateWebsiteUrl } from '../../utils/websiteUtils.js';

export const createClientWebsite = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { customWebsiteName } = req.body;
        
        console.log('Creating website for client:', clientId);
        
        const client = await Client.findById(clientId);
        if (!client) {
            console.log('Client not found:', clientId);
            return res.status(404).json({ message: "Client not found" });
        }

        // Get the website details to get the businessName
        const website = await Website.findOne({ clientId });
        if (!website) {
            console.log('Website not found for client:', clientId);
            return res.status(404).json({ message: "Website details not found" });
        }

        // Use businessName as default if customWebsiteName is not provided
        const websiteName = customWebsiteName || website.businessName;
        if (!websiteName) {
            return res.status(400).json({ message: "Business name is required" });
        }

        console.log('Using website name:', websiteName);
        
        // Check if the website name is already taken
        const existingClient = await Client.findOne({ customWebsiteName: websiteName });
        if (existingClient && existingClient._id.toString() !== clientId) {
            console.log('Website name already taken:', websiteName);
            return res.status(400).json({ message: "This website name is already taken" });
        }

        // Generate a unique website URL using the website name
        const { fullUrl, websitePath } = generateWebsiteUrl(client, websiteName);
        console.log('Generated website path:', websitePath);
        
        // Update client with website URL and custom name
        client.customWebsiteName = websiteName;
        client.website = fullUrl;
        await client.save();
        
        console.log('Website created successfully for client:', clientId);
        console.log('Stored website URL:', client.website);

        res.status(200).json({
            message: "Website created successfully",
            websiteUrl: fullUrl,
            websitePath: websitePath,
            customWebsiteName: websiteName,
            businessName: website.businessName
        });
    } catch (error) {
        console.error('Error creating website:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getClientWebsite = async (req, res) => {
    try {
        const { websiteUrl } = req.params;
        console.log('Searching for website with path:', websiteUrl);
        
        // First, let's check what's in the database
        const allClients = await Client.find({}, 'website customWebsiteName');
        console.log('All clients in database:', allClients);
        
        // Extract the custom name from the URL (everything before the first hyphen)
        const customName = websiteUrl.split('-')[0];
        console.log('Extracted custom name:', customName);
        
        // Search for the client using the custom name
        const client = await Client.findOne({ customWebsiteName: customName });
        
        if (!client) {
            console.log('No client found with custom name:', customName);
            console.log('Available URLs:', allClients.map(c => c.website).filter(Boolean));
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
        console.error('Error in getClientWebsite:', error);
        res.status(500).json({ message: error.message });
    }
};
