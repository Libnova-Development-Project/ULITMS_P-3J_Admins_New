const PeripheralModel = require('../models/peripheralModel');
const pool = require('../database/db');

exports.getAllPeripherals = async (req, res) => {
    try {
        const { unit_id, limit = 100, offset = 0 } = req.query;
        const result = await PeripheralModel.getAll(
            unit_id, 
            parseInt(limit), 
            parseInt(offset)
        );
        
        res.json({
            message: 'Peripherals retrieved',
            ...result
        });
    } catch (error) {
        console.error('Get peripherals error:', error);
        res.status(500).json({ message: 'Failed to retrieve peripherals', error: error.message });
    }
};

exports.getPeripheralById = async (req, res) => {
    try {
        const { id } = req.params;
        const peripheral = await PeripheralModel.findById(id);
        
        if (!peripheral) {
            return res.status(404).json({ message: 'Peripheral not found' });
        }
        
        res.json({
            message: 'Peripheral retrieved',
            peripheral
        });
    } catch (error) {
        console.error('Get peripheral error:', error);
        res.status(500).json({ message: 'Failed to retrieve peripheral', error: error.message });
    }
};

exports.createPeripheral = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const peripheral = await PeripheralModel.create(req.body);
        
        res.status(201).json({
            message: 'Peripheral created successfully',
            peripheral
        });
    } catch (error) {
        console.error('Create peripheral error:', error);
        res.status(500).json({ message: 'Failed to create peripheral', error: error.message });
    }
};

exports.updatePeripheral = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const peripheral = await PeripheralModel.update(id, req.body);
        
        if (!peripheral) {
            return res.status(404).json({ message: 'Peripheral not found' });
        }
        
        res.json({
            message: 'Peripheral updated successfully',
            peripheral
        });
    } catch (error) {
        console.error('Update peripheral error:', error);
        res.status(500).json({ message: 'Failed to update peripheral', error: error.message });
    }
};

exports.deletePeripheral = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const peripheral = await PeripheralModel.delete(id);
        
        if (!peripheral) {
            return res.status(404).json({ message: 'Peripheral not found' });
        }
        
        res.json({ message: 'Peripheral deleted successfully' });
    } catch (error) {
        console.error('Delete peripheral error:', error);
        res.status(500).json({ message: 'Failed to delete peripheral', error: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await PeripheralModel.getCategories();
        res.json({
            message: 'Categories retrieved',
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Failed to retrieve categories', error: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Category name required' });
        }
        
        const category = await PeripheralModel.createCategory(name, description);
        
        res.status(201).json({
            message: 'Category created',
            category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ message: 'Failed to create category', error: error.message });
    }
};

exports.updateCondition = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { id } = req.params;
        const { condition } = req.body;
        
        if (!condition) {
            return res.status(400).json({ message: 'Condition required' });
        }
        
        const peripheral = await PeripheralModel.updateCondition(id, condition);
        
        if (!peripheral) {
            return res.status(404).json({ message: 'Peripheral not found' });
        }
        
        res.json({
            message: 'Condition updated',
            peripheral
        });
    } catch (error) {
        console.error('Update condition error:', error);
        res.status(500).json({ message: 'Failed to update condition', error: error.message });
    }
};