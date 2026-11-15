const Notification = require('../models/Notification');

class NotificationService {
  async createNotification({ companyId, userId = null, type, title, message, link = '' }) {
    return await Notification.create({
      companyId,
      userId,
      type,
      title,
      message,
      link,
      read: false,
    });
  }

  async getNotifications({ companyId, userId, page = 1, limit = 20 }) {
    const query = {
      companyId,
      $or: [{ userId: null }, { userId }],
    };

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, read: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markAsRead(notificationId, companyId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, companyId },
      { read: true },
      { new: true }
    );
  }

  async markAllAsRead(companyId, userId) {
    const query = {
      companyId,
      $or: [{ userId: null }, { userId }],
    };
    return await Notification.updateMany(query, { read: true });
  }
}

module.exports = new NotificationService();
