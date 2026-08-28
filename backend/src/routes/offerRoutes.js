import { Router } from 'express';

import {
  createAdminOffer,
  deleteAdminOffer,
  getActiveOffers,
  getAdminOfferById,
  getAdminOffers,
  updateAdminOffer,
  updateAdminOfferStatus,
} from '../controllers/offerController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getActiveOffers);

export const adminOfferRouter = Router();
adminOfferRouter.use(requireAuth, requireAdmin);
adminOfferRouter.get('/', getAdminOffers);
adminOfferRouter.get('/:id', getAdminOfferById);
adminOfferRouter.post('/', createAdminOffer);
adminOfferRouter.put('/:id', updateAdminOffer);
adminOfferRouter.patch('/:id/status', updateAdminOfferStatus);
adminOfferRouter.delete('/:id', deleteAdminOffer);

export default router;
