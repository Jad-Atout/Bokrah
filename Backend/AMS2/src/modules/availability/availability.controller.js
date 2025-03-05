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

export const getAvailability = async (req, res, next) => {
    try {
        const { staffId } = req.params;
        const staff = await staffModel.findById(staffId)
            .populate([
                {
                    path: "availability",
                    ref: "Availability",
                    select: "-__v -_id"
                },
                {
                    path: "userId",
                    ref: "User",
                    select: "userName email phoneNumber"
                }
            ]);

        if (!staff) {
            return next(new AppError("Staff not found", 404));
        }

        const { timeZone, availability } = staff.availability;

        const transformedAvailability = {
            timeZone,
            availability: availability.map(dayEntry => ({
                day: dayEntry.day,
                slots: dayEntry.slots.map(slot => ({
                    startTime: slot.startTime,
                    endTime: slot.endTime
                }))
            }))
        };

        return res.status(200).json({
            message: "Availability retrieved successfully",
            data: transformedAvailability
        });
    } catch (error) {
        return next(new AppError(`Failed to retrieve availability: ${error.message}`, 500));
    }
};

export const updateAvailability = async (req, res, next) => {
    try {
        const { staffId, timeZone, availability } = req.body;

        const staff = await staffModel.findById(staffId);
        if (!staff) {
            return next(new Error("Staff not found"));
        }

        if (!staff.availability) {
            return res.status(404).json({ message: "No availability set for this staff to update" });
        }

        const updatedAvailability = await availabilityModel.findByIdAndUpdate(
            staff.availability,
            { timeZone, availability },
            { new: true }
        );

        const data = await staff.populate([
            {
                path: "availability",
                ref: "Availability",
                select: "-_id"
            },
            {
                path: "userId",
                ref: "User",
                select: "userName email phoneNumber"
            }
        ]);

        return res.status(200).json({ message: "Availability updated successfully", data });
    } catch (error) {
        return next(new Error(`Failed to update availability: ${error.message}`));
    }
};