import {Router} from 'express';
import {validationHandler} from "../../middleware/validation.js";
import {asyncHandler} from "../../utils/catchError.js";
import {
    clientLogin,
    clientRegister,
    deleteClient,
    gClientLogin,
    googleAuthCallback,
    updateClient
} from "./client.controller.js";
import {clientLoginSchema, clientRegisterSchema, deleteClientSchema, updateClientSchema} from "./client.validation.js";
import auth from "../../middleware/auth.js";
import {verifyRole} from "./client.auth.js";
import checkUserExistence from "../../middleware/checkUserExistence.js";
const router = Router();

router.post('/register',
    validationHandler(clientRegisterSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(clientRegister),
)
router.delete('/:id',
    auth(),
    validationHandler(deleteClientSchema),
    asyncHandler(verifyRole()),
    asyncHandler(deleteClient),
    )
router.put('/:id',
    auth(),
    validationHandler(updateClientSchema)
    ,asyncHandler( verifyRole())
    ,asyncHandler(updateClient)
)
router.get('/gLogin',
    asyncHandler(gClientLogin)
)
router.get('/login',
    validationHandler(clientLoginSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(clientLogin),

)
router.get('/oauth2callback',
    asyncHandler(googleAuthCallback)
)
export default router;
