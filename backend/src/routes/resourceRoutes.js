import express from 'express';
import {
  getResources,
  getResourceById,
  createResource,
  updateResourceStatus,
} from '../controllers/resourceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All resource routes require authentication
router.use(protect);

/**
 * @route   GET /api/resources
 * @desc    List all resources with optional query filters
 * @access  Private (All authenticated roles)
 */
router.get('/', getResources);

/**
 * @route   GET /api/resources/:id
 * @desc    Get single resource
 * @access  Private
 */
router.get('/:id', getResourceById);

/**
 * @route   POST /api/resources
 * @desc    Create new resource
 * @access  Private (Admin only)
 */
router.post('/', authorize('admin'), createResource);

/**
 * @route   PUT /api/resources/:id/status
 * @desc    Update resource operational and current status
 * @access  Private (Admin and Doctor)
 */
router.put('/:id/status', authorize('admin', 'doctor'), updateResourceStatus);

export default router;
