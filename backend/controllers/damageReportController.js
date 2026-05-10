const DamageReportModel = require('../models/damageReportModel');
const pool = require('../database/db');

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
            message: 'Damage reports retrieved',
            ...result
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ message: 'Failed to retrieve reports', error: error.message });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await DamageReportModel.findById(id);
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        res.json({
            message: 'Report retrieved',
            report
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ message: 'Failed to retrieve report', error: error.message });
    }
};

exports.createReport = async (req, res) => {
    try {
        const {
            unit_id, peripheral_id, damage_type,
            description, severity, damage_metadata
        } = req.body;
        
        if (!damage_type || !description) {
            return res.status(400).json({ message: 'Damage type and description required' });
        }
        
        const report = await DamageReportModel.create({
            reported_by: req.user.id,
            unit_id,
            peripheral_id,
            damage_type,
            description,
            severity,
            damage_metadata
        });
        
        res.status(201).json({
            message: 'Damage report submitted',
            report
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ message: 'Failed to submit report', error: error.message });
    }
};

exports.resolveReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const { resolution_notes } = req.body;
        
        const report = await DamageReportModel.resolve(id, req.user.id, resolution_notes);
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found or already resolved' });
        }
        
        res.json({
            message: 'Report resolved',
            report
        });
    } catch (error) {
        console.error('Resolve report error:', error);
        res.status(500).json({ message: 'Failed to resolve report', error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const stats = await DamageReportModel.getStats();
        res.json({
            message: 'Statistics retrieved',
            stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Failed to retrieve stats', error: error.message });
    }
};