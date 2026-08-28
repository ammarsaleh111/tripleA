import { Router } from 'express';

import adminRoutes from './adminRoutes.js';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js';
import contactRoutes from './contactRoutes.js';
import offerRoutes, { adminOfferRouter } from './offerRoutes.js';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/contact', contactRoutes);
router.use('/offers', offerRoutes);
router.use('/admin/offers', adminOfferRouter);

export default router;
