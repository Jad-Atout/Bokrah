export const asyncHandler = (func)=>{
    return async (req,res,next)=>{
        try {
            return await func(req,res,next);
        }catch (e){
            return res.status(500).json({message: e.message,error: e});
        }
    }
}