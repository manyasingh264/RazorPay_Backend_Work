import { Router } from 'express';
import { validateRegister } from './dto/register.dto.js';
import { validateLogin } from './dto/login.dto.js';
import { validateLogout } from './dto/logout.dto.js';
import {
  registerController,
  loginController,
  logoutController,
} from './onboarding.controller.js';

const router = Router();

router.post('/register', validateRegister, registerController);
router.post('/login', validateLogin, loginController);
router.post('/logout', validateLogout, logoutController);

export default router;
