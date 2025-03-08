import mongoose from 'mongoose';
const availabilitySchema = new mongoose.Schema({
    timeZone: { type: String, required: true },
    availability: [
        {
            day: { type: String, required: true },
            slots: [
                {
                    startTime: { type: String, required: true },
                    endTime: { type: String, required: true },
                }
            ]
        }
    ]
}, );


export default mongoose.model('Availability', availabilitySchema);
