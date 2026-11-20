const DamageReportModel = require('../models/damageReportModel');
const pool = require('../config/database');

exports.getAllReports = async (req, res) => {
    try {
        const { limit = 100, offset = 0, status, severity } = req.query;
        const result = await DamageReportModel.getAll(
            parseInt(limit), 
            parseInt(offset), 
            status, 
            severity
        );
        
        res.json({
            success: true,
            message: 'Damage reports retrieved',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve reports', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await DamageReportModel.findById(id);
        
        if (!report) {
            return res.status(404).json({ 
                success: false,
                message: 'Report not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Report retrieved',
            data: { report },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve report', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.createReport = async (req, res) => {
    try {
        const {
            unit_id, peripheral_id, book_id, item_type = 'hardware', 
            damage_type, description, severity, damage_metadata
        } = req.body;
        
        if (!damage_type || !description) {
            return res.status(400).json({ 
                success: false,
                message: 'Damage type and description required',
                timestamp: new Date().toISOString()
            });
        }
        
        const report = await DamageReportModel.create({
            reported_by: req.user.id,
            unit_id,
            peripheral_id,
            book_id,
            item_type,
            damage_type,
            description,
            severity,
            damage_metadata
        });
        
        res.status(201).json({
            success: true,
            message: 'Damage report submitted',
            data: { report },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to submit report', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.resolveReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        const { id } = req.params;
        const { resolution_notes } = req.body;
        
        const report = await DamageReportModel.resolve(id, req.user.id, resolution_notes);
        
        if (!report) {
            return res.status(404).json({ 
                success: false,
                message: 'Report not found or already resolved',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Report resolved',
            data: { report },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Resolve report error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to resolve report', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        const stats = await DamageReportModel.getStats();
        res.json({
            success: true,
            message: 'Statistics retrieved',
            data: { stats },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve stats', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};