const ElibraryModel = require('../models/elibraryModel');
const pool = require('../config/database');

exports.getAllUnits = async (req, res) => {
    try {
        const { activeOnly = true } = req.query;
        const units = await ElibraryModel.getAllUnits(activeOnly === 'true');
        
        res.json({
            message: 'E-Library units retrieved',
            count: units.length,
            units
        });
    } catch (error) {
        console.error('Get units error:', error);
        res.status(500).json({ message: 'Failed to retrieve units', error: error.message });
    }
};

exports.getUnitById = async (req, res) => {
    try {
        const { id } = req.params;
        const unit = await ElibraryModel.getUnitById(id);
        
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        res.json({
            message: 'Unit retrieved',
            unit
        });
    } catch (error) {
        console.error('Get unit error:', error);
        res.status(500).json({ message: 'Failed to retrieve unit', error: error.message });
    }
};

exports.createUnit = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const unit = await ElibraryModel.createUnit(req.body);
        
        res.status(201).json({
            message: 'Unit created successfully',
            unit
        });
    } catch (error) {
        console.error('Create unit error:', error);
        res.status(500).json({ message: 'Failed to create unit', error: error.message });
    }
};

exports.updateUnit = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const unit = await ElibraryModel.updateUnit(id, req.body);
        
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        res.json({
            message: 'Unit updated successfully',
            unit
        });
    } catch (error) {
        console.error('Update unit error:', error);
        res.status(500).json({ message: 'Failed to update unit', error: error.message });
    }
};

exports.deleteUnit = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const unit = await ElibraryModel.deleteUnit(id);
        
        if (!unit) {
            return res.status(404).json({ message: 'Unit not found' });
        }
        
        res.json({ message: 'Unit deleted successfully' });
    } catch (error) {
        console.error('Delete unit error:', error);
        res.status(500).json({ message: 'Failed to delete unit', error: error.message });
    }
};

exports.startSession = async (req, res) => {
    try {
        const { unit_id, purpose } = req.body;
        const user_id = req.user.id;
        
        if (!unit_id) {
            return res.status(400).json({ message: 'Unit ID required' });
        }
        
        const session = await ElibraryModel.startSession(user_id, unit_id, purpose, req.user.id);
        
        res.status(201).json({
            message: 'Session started',
            session
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ message: error.message || 'Failed to start session' });
    }
};

exports.endSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ElibraryModel.endSession(id, req.user.id, req.user.role === 'admin');
        
        if (!session) {
            return res.status(404).json({ message: 'Session not found or already ended' });
        }
        
        res.json({
            message: 'Session ended',
            session
        });
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ message: 'Failed to end session', error: error.message });
    }
};

exports.getUserSessions = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check permission
        if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const sessions = await ElibraryModel.getUserSessions(userId);
        
        res.json({
            message: 'User sessions retrieved',
            count: sessions.length,
            sessions
        });
    } catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({ message: 'Failed to retrieve sessions', error: error.message });
    }
};

exports.getAllSessions = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { limit = 100, offset = 0, activeOnly = false } = req.query;
        const result = await ElibraryModel.getAllSessions(
            parseInt(limit), 
            parseInt(offset), 
            activeOnly === 'true'
        );
        
        res.json({
            message: 'Sessions retrieved',
            ...result
        });
    } catch (error) {
        console.error('Get all sessions error:', error);
        res.status(500).json({ message: 'Failed to retrieve sessions', error: error.message });
    }
};

exports.getActiveSessions = async (req, res) => {
    try {
        const sessions = await ElibraryModel.getActiveSessions();
        
        res.json({
            message: 'Active sessions retrieved',
            count: sessions.length,
            sessions
        });
    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ message: 'Failed to retrieve active sessions', error: error.message });
    }
};
