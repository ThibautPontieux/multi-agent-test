// Script d'intégration pour ajouter le monitoring au serveur MCP existant
// À exécuter pour modifier votre index.js actuel

const fs = require('fs');
const path = require('path');

class MCPIntegrator {
    constructor(originalMCPPath) {
        this.originalMCPPath = originalMCPPath;
        this.backupPath = originalMCPPath + '.backup';
    }
    
    async integrate() {
        try {
            console.log('Début de l\'intégration du monitoring...');
            
            // 1. Créer une sauvegarde
            await this.createBackup();
            
            // 2. Lire le fichier original
            const originalCode = await fs.promises.readFile(this.originalMCPPath, 'utf8');
            
            // 3. Ajouter les imports nécessaires
            const modifiedCode = this.addMonitoringImports(originalCode);
            
            // 4. Modifier la classe MultiAgentMCP
            const finalCode = this.modifyMCPClass(modifiedCode);
            
            // 5. Écrire le fichier modifié
            await fs.promises.writeFile(this.originalMCPPath, finalCode);
            
            console.log('Intégration terminée avec succès!');
            console.log(`Backup créé: ${this.backupPath}`);
            console.log('Redémarrez le serveur MCP pour activer le monitoring.');
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'intégration:', error);
            await this.restoreBackup();
            return false;
        }
    }
    
    async createBackup() {
        await fs.promises.copyFile(this.originalMCPPath, this.backupPath);
        console.log('Backup créé');
    }
    
    async restoreBackup() {
        if (fs.existsSync(this.backupPath)) {
            await fs.promises.copyFile(this.backupPath, this.originalMCPPath);
            console.log('Backup restauré');
        }
    }
    
    addMonitoringImports(code) {
        // Ajouter l'import WebSocket après les imports existants
        const importRegex = /(import.*from.*['"];?\s*)+/;
        const match = code.match(importRegex);
        
        if (match) {
            const newImports = `${match[0]}
import { WebSocketServer } from 'ws';
import { MonitoringExtension } from './monitoring-extension.js';
`;
            return code.replace(importRegex, newImports);
        }
        
        // Fallback: ajouter au début du fichier
        return `import { WebSocketServer } from 'ws';
import { MonitoringExtension } from './monitoring-extension.js';
${code}`;
    }
    
    modifyMCPClass(code) {
        // Ajouter la propriété monitoring à la classe
        const constructorRegex = /(constructor\(\)\s*{)/;
        const constructorReplacement = `$1
        this.monitoring = null;`;
        
        let modifiedCode = code.replace(constructorRegex, constructorReplacement);
        
        // Ajouter l'initialisation du monitoring après la setup des handlers
        const setupRegex = /(this\.setupRequestHandlers\(\);)/;
        const setupReplacement = `$1
        this.initializeMonitoring();`;
        
        modifiedCode = modifiedCode.replace(setupRegex, setupReplacement);
        
        // Ajouter la méthode initializeMonitoring avant la dernière accolade
        const lastBraceRegex = /(\s*})(\s*$)/;
        const monitoringMethods = `
    initializeMonitoring() {
        try {
            this.monitoring = new MonitoringExtension(this);
            console.error('Monitoring extension initialized');
        } catch (error) {
            console.error('Failed to initialize monitoring:', error);
        }
    }

    // Hook monitoring dans les méthodes existantes
    async updateTaskStatus(args) {
        const result = await super.updateTaskStatus ? 
            super.updateTaskStatus(args) : 
            this.originalUpdateTaskStatus(args);
        
        if (this.monitoring) {
            this.monitoring.onTaskStatusChanged(args.taskId, args.status, args.agent);
        }
        
        return result;
    }

    async startWorkflow(args) {
        const result = await this.originalStartWorkflow ? 
            this.originalStartWorkflow(args) : 
            this.defaultStartWorkflow(args);
        
        if (this.monitoring && result.workflowId) {
            this.monitoring.onWorkflowStarted(
                result.workflowId, 
                args.workflowType, 
                args.projectName
            );
        }
        
        return result;
    }

    // Préserver les méthodes originales
    originalUpdateTaskStatus(args) {
        const task = this.tasks.find(t => t.id === args.taskId);
        if (!task) {
            throw new Error(\`Task \${args.taskId} not found\`);
        }
        task.status = args.status;
        
        this.agentStates.set(args.agent, {
            status: args.status === 'completed' ? 'idle' : 'active',
            lastActive: new Date().toISOString()
        });
        
        // Auto-progress workflow if needed
        if (args.status === 'completed' && task.workflowId) {
            setTimeout(async () => {
                await this.executeWorkflowStep({
                    workflowId: task.workflowId,
                    agent: 'orchestrator'
                });
            }, 1000);
        }
        
        return {
            content: [{
                type: 'text',
                text: \`Task \${args.taskId} status updated to \${args.status}\`
            }]
        };
    }

    defaultStartWorkflow(args) {
        const workflow = {
            id: Date.now().toString(),
            name: args.workflowType,
            description: args.description || \`Automated \${args.workflowType} workflow for \${args.projectName}\`,
            steps: this.getWorkflowTemplate(args.workflowType),
            status: 'running',
            currentStep: 0,
            created: new Date().toISOString()
        };
        
        this.workflows.push(workflow);
        
        return {
            content: [{
                type: 'text',
                text: \`Workflow started: \${workflow.id}\`
            }],
            workflowId: workflow.id
        };
    }
$1$2`;
        
        return modifiedCode.replace(lastBraceRegex, monitoringMethods);
    }
}

// Utilisation
async function integrateMonitoring() {
    const mcpPath = process.argv[2];
    
    if (!mcpPath) {
        console.error('Usage: node integrate-monitoring.js <chemin-vers-index.js>');
        process.exit(1);
    }
    
    if (!fs.existsSync(mcpPath)) {
        console.error('Fichier MCP non trouvé:', mcpPath);
        process.exit(1);
    }
    
    const integrator = new MCPIntegrator(mcpPath);
    const success = await integrator.integrate();
    
    process.exit(success ? 0 : 1);
}

// Exporter pour utilisation en module ou exécution directe
if (require.main === module) {
    integrateMonitoring();
}

module.exports = { MCPIntegrator };