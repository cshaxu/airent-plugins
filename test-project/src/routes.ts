// library imports
import { Router } from 'express';

// entity imports
import UserHandler from './generated/handlers/user.js';

const router = Router();

router.post('/get-many-users', UserHandler.getMany);
router.post('/get-one-user', UserHandler.getOne);
router.post('/get-one-user-safe', UserHandler.getOneSafe);
router.post('/create-one-user', UserHandler.createOne);
router.post('/update-one-user', UserHandler.updateOne);
router.post('/delete-one-user', UserHandler.deleteOne);

export default router;
