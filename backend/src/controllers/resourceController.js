import Resource from '../models/Resource.js';
import { getIO } from '../socket.js';

/**
 * @desc    Get all resources with optional query filters
 * @route   GET /api/resources
 * @access  Private (All authenticated roles)
 */
export const getResources = async (req, res, next) => {
  try {
    const { type, status, isOperational, department } = req.query;
    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.currentStatus = status;
    }

    if (isOperational !== undefined) {
      filter.isOperational = isOperational === 'true';
    }

    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }

    const resources = await Resource.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single resource by ID
 * @route   GET /api/resources/:id
 * @access  Private
 */
export const getResourceById = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      res.status(404);
      throw new Error(`Resource not found with id of ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new hospital resource
 * @route   POST /api/resources
 * @access  Private (Admin only)
 */
export const createResource = async (req, res, next) => {
  try {
    const { name, type, department, isOperational, currentStatus } = req.body;

    if (!name || !type) {
      res.status(400);
      throw new Error('Please provide resource name and type');
    }

    const resource = await Resource.create({
      name,
      type,
      department,
      isOperational: isOperational !== undefined ? isOperational : true,
      currentStatus: currentStatus || 'available',
    });

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update resource operational and availability status
 * @route   PUT /api/resources/:id/status
 * @access  Private (Admin & Doctor)
 */
export const updateResourceStatus = async (req, res, next) => {
  try {
    const { currentStatus, isOperational } = req.body;

    const validStatuses = ['available', 'occupied', 'sanitizing', 'maintenance'];
    if (currentStatus && !validStatuses.includes(currentStatus)) {
      res.status(400);
      throw new Error(
        `Invalid status '${currentStatus}'. Allowed values: ${validStatuses.join(', ')}`
      );
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      res.status(404);
      throw new Error(`Resource not found with id of ${req.params.id}`);
    }

    if (currentStatus) {
      resource.currentStatus = currentStatus;
    }

    if (isOperational !== undefined) {
      resource.isOperational = Boolean(isOperational);
    }

    const updatedResource = await resource.save();

    // Broadcast real-time resource state sync to admin room
    const io = getIO();
    io.to('room:admin').emit('resource:updated', {
      resourceId: updatedResource._id,
      name: updatedResource.name,
      type: updatedResource.type,
      department: updatedResource.department,
      currentStatus: updatedResource.currentStatus,
      isOperational: updatedResource.isOperational,
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Resource status updated successfully',
      data: updatedResource,
    });
  } catch (error) {
    next(error);
  }
};
