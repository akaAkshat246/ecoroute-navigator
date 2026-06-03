import express from 'express';
import { getRoutes } from '../controllers/routeController.js';

const router = express.Router();

router.post('/routes', getRoutes);

export default router;
