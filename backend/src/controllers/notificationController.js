const notificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/response');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const data = await notificationService.getNotifications({
        companyId: req.companyId,
        userId: req.user._id,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      return successResponse(res, data, 'Notifications retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.companyId);
      if (!notification) {
        return errorResponse(res, 'Notification not found.', 404);
      }
      return successResponse(res, notification, 'Notification marked as read.');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await notificationService.markAllAsRead(req.companyId, req.user._id);
      return successResponse(res, null, 'All notifications marked as read.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
