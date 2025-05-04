import crypto from 'crypto';

export const generateWebsiteUrl = (client, customWebsiteName) => {
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const clientId = client._id.toString().slice(-6);
    
    const websitePath = `${customWebsiteName}-${clientId}-${uniqueId}`;
    
    return {
        fullUrl: `http://localhost:5173/Bokrah.com/${websitePath}`,
        websitePath: websitePath
    };
}; 