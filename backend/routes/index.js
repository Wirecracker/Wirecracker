import express from 'express';
import cors from 'cors';
import tableRoutes from './tableRoutes.js';
import localizationRoutes from './localizationRoutes.js';
import designationRoutes from './designationRoutes.js';
import stimulationRoutes from './stimulationRoutes.js';
import testRoutes from './testRoutes.js';
import searchRoutes from './searchRoutes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import fileRoutes from './fileRoutes.js';
import docsRoutes from './docsRoutes.js';
import fileShareRoutes from './fileShareRoutes.js';
import brainConfigMappingRoutes from './brainConfigMappingRoutes.js';

const router = express.Router();
router.use(cors());
router.use(express.json());

// Apply all routes
router.use('/', tableRoutes);
router.use('/', localizationRoutes);
router.use('/', designationRoutes);
router.use('/', stimulationRoutes);
router.use('/', testRoutes);
router.use('/', searchRoutes);
router.use('/', userRoutes);
router.use('/', authRoutes);
router.use('/', fileRoutes);
router.use('/', docsRoutes);
router.use('/', fileShareRoutes);
router.use('/', brainConfigMappingRoutes);

export default router; 