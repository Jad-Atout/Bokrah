import {customAlphabet} from "nanoid";

export const login = async (req, res) => {

}
export const register= async (req, res) => {

}
export const sendCode = async (req, res) => {
    const {email,phoneNumber} = req.body;
    const code = customAlphabet('1234567890',6)()

    return res.status(200).json({code:code})
}