import mongoose from "mongoose";
//TODO: client block newCustomer if he absent for more than three times

const ClientCustomerSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    isActive: { type: Boolean, default: true },
});

export default mongoose.model('UserClient', ClientCustomerSchema);


