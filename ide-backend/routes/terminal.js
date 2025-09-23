const express = require('express');
const router = express.Router();
const terminalService = require('../services/terminal');
const logger = require('../utils/logger');

// Create new terminal
router.post('/create/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const terminalId = terminalService.createTerminal(workspaceId);
        
        res.json({
            success: true,
            terminalId,
            message: 'Terminal created successfully'
        });
    } catch (error) {
        logger.error('Failed to create terminal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Execute command
router.post('/execute/:terminalId', async (req, res) => {
    try {
        const { terminalId } = req.params;
        const { command } = req.body;
        
        const result = await terminalService.executeCommand(parseInt(terminalId), command);
        
        res.json({
            success: true,
            result
        });
    } catch (error) {
        logger.error('Failed to execute command:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List terminals
router.get('/list', (req, res) => {
    try {
        const terminals = terminalService.listTerminals();
        res.json({
            success: true,
            terminals
        });
    } catch (error) {
        logger.error('Failed to list terminals:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Close terminal
router.delete('/:terminalId', (req, res) => {
    try {
        const { terminalId } = req.params;
        terminalService.closeTerminal(parseInt(terminalId));
        
        res.json({
            success: true,
            message: 'Terminal closed successfully'
        });
    } catch (error) {
        logger.error('Failed to close terminal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;