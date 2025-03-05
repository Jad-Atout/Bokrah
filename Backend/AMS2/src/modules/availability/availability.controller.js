import availabilityModel from "../../../DB/models/availability.js"
import staffModel from "../../../DB/models/staff.js"
export const setAvailability = async (req, res, next) => {
    const {staffId,timeZone,availability} = req.body

    const staff = await staffModel.findById(staffId)
    if (!staff) {
        return next(new Error( "Staff isn't found"))
    }
    if(staff.availability){
        await availabilityModel.findByIdAndUpdate(
            staff.availability,
            {timeZone,availability },
            {new:true}
        )
    }else {
        const newAvailability = new  availabilityModel({
            timeZone,
            availability
        });
        await newAvailability.save();
        staff.availability = newAvailability._id;
        await staff.save();
    }

    const data = await staff.populate([
        {
            path: "availability",
            ref: "Availability",
            select:"-_id"
        },{
        path:"userId",
            ref: "User",
            select:"userName email phoneNumber"

        }
            ])
    return res.status(201).json({message:"successfully set availability",data:data});
}

export const deleteAvailability = async (req, res, next) => {
    const { staffId } = req.body;
    const staff = await staffModel.findById(staffId);

    if (!staff) {
        return next(new Error("Staff not found"));
    }

    if (staff.availability) {

        await availabilityModel.findByIdAndDelete(staff.availability);

        staff.availability = null;
        await staff.save();

        return res.status(200).json({ message: "Availability deleted successfully" });
    } else {
        return res.status(404).json({ message: "No availability assigned to this staff" });
    }
};

export const getAvailibilty = async (req, res, next) => {
    return res.json(await availabilityModel.findById(req.body.id))
}