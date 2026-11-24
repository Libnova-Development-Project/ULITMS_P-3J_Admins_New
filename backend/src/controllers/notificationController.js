const NotificationModel = require('../models/notificationModel');

class NotificationController {
    static async getMyNotifications(req, res) {
        try {
            const userId = req.user.id;
            const notifications = await NotificationModel.getByUserId(userId);
            const unreadCount = await NotificationModel.getUnreadCount(userId);
            
            res.json({
                success: true,
                notifications,
                unreadCount
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    static async markRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const result = await NotificationModel.markAsRead(id, userId);
            
            if (!result) {
                return res.status(404).json({ success: false, message: 'Notification not found' });
            }
            
            res.json({ success: true, message: 'Notification marked as read' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    static async markAllRead(req, res) {
        try {
            const userId = req.user.id;
            await NotificationModel.markAllAsRead(userId);
            res.json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = NotificationController;
