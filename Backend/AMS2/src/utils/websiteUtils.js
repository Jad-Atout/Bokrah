import crypto from 'crypto';

export const generateWebsiteUrl = (client, customWebsiteName) => {
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const clientId = client._id;
    
    const websitePath = `${customWebsiteName}`;
    
    return {
        fullUrl: `http://localhost:5173/${clientId}/${websitePath}/Bookrah.com`,
        websitePath: websitePath
    };
}; 