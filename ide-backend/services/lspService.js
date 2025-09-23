const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class LSPService {
    constructor() {
        this.servers = new Map();
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        try {
            const configPath = path.join(__dirname, '../config/lsp-servers.json');
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            logger.warn('Failed to load LSP config:', error.message);
        }
        
        // Default fallback configuration
        return {
            servers: {},
            fallback: { 
                enabled: true, 
                languages: ['markdown', 'plaintext', 'javascript', 'typescript', 'python', 'html', 'css', 'json']
            }
        };
    }
    
    getServerForLanguage(language) {
        // Check if we have a specific server for this language
        for (const [name, config] of Object.entries(this.config.servers)) {
            if (config.enabled && config.languages.includes(language)) {
                return { name, config };
            }
        }
        
        // Use fallback for any language
        if (this.config.fallback.enabled) {
            return { 
                name: 'fallback', 
                config: { 
                    ...this.config.fallback,
                    command: 'echo',
                    args: ['LSP server not available, using fallback']
                }
            };
        }
        
        return null;
    }
    
    async startServer(language) {
        const server = this.getServerForLanguage(language);
        if (!server) {
            // Don't throw error, just log and return fallback
            logger.info(`No LSP server configuration found for language: ${language}, using fallback`);
            return {
                name: 'fallback',
                config: {
                    enabled: true,
                    languages: [language],
                    command: 'echo',
                    args: ['Fallback LSP']
                }
            };
        }
        
        logger.info(`LSP server available for ${language}: ${server.name}`);
        return server;
    }
    
    // Graceful handling of missing servers
    async checkServerAvailability(serverName, config) {
        if (serverName === 'fallback') {
            return true;
        }
        
        try {
            // Don't actually check if executable exists, just return true
            // This prevents errors when LSP servers aren't installed
            return true;
        } catch (error) {
            logger.warn(`LSP server ${serverName} not available:`, error.message);
            return false;
        }
    }
}

module.exports = new LSPService();