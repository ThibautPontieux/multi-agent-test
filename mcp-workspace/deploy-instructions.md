# Instructions de Déploiement - Dashboard Monitoring Multi-Agents

## Prérequis Techniques

### Dépendances Node.js
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.0",
    "node-fetch": "^3.3.0",
    "ws": "^8.15.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/ws": "^8.5.0"
  }
}
```

### Structure des Fichiers
```
mcp-workspace/
├── monitoring-extension.js     # Extension WebSocket pour monitoring
├── dashboard-live.html         # Dashboard web avec connexion temps réel
├── integrate-monitoring.js     # Script d'intégration automatique
└── deploy-instructions.md      # Ce fichier
```

## Étapes de Déploiement

### 1. Installation des Dépendances
```bash
# Dans le répertoire de votre serveur MCP actuel
npm install ws @types/ws

# Vérifier que le serveur fonctionne toujours
node index.js
```

### 2. Intégration du Monitoring (Option Automatique)
```bash
# Copier les fichiers monitoring dans votre répertoire MCP
cp mcp-workspace/monitoring-extension.js /path/to/your/mcp/
cp mcp-workspace/integrate-monitoring.js /path/to/your/mcp/

# Exécuter l'intégration automatique
cd /path/to/your/mcp/
node integrate-monitoring.js index.js
```

### 3. Intégration Manuelle (Recommandée pour contrôle total)

#### A. Modifier votre index.js existant

**Ajouter les imports en haut de fichier:**
```javascript
import { WebSocketServer } from 'ws';
```

**Ajouter dans le constructeur de MultiAgentMCP:**
```javascript
constructor() {
    // Code existant...
    
    // Nouveau: Monitoring extension
    this.monitoring = null;
    this.wsServer = null;
    this.connectedClients = new Set();
    this.metrics = this.initializeMetrics();
}
```

**Ajouter après setupRequestHandlers():**
```javascript
setupRequestHandlers() {
    // Code existant...
    
    // Nouveau: Initialize monitoring
    this.initializeMonitoring();
}
```

**Ajouter les méthodes de monitoring:**
```javascript
initializeMonitoring() {
    try {
        this.setupWebSocketServer();
        this.setupMetricsCollection();
        console.error('Monitoring initialized on port 8080');
    } catch (error) {
        console.error('Monitoring initialization failed:', error);
    }
}

setupWebSocketServer() {
    this.wsServer = new WebSocketServer({ port: 8080 });
    
    this.wsServer.on('connection', (ws) => {
        console.error('Dashboard client connected');
        this.connectedClients.add(ws);
        
        // Send initial state
        this.sendToClient(ws, {
            type: 'initial_state',
            data: this.getCurrentState()
        });
        
        ws.on('close', () => {
            this.connectedClients.delete(ws);
        });
    });
}

getCurrentState() {
    const activeWorkflows = this.workflows
        .filter(w => w.status === 'running')
        .map(w => ({
            id: w.id,
            name: w.name,
            currentStep: w.currentStep,
            totalSteps: w.steps.length,
            progress: Math.round((w.currentStep / w.steps.length) * 100)
        }));
    
    return {
        activeWorkflows,
        agentStates: Array.from(this.agentStates.entries()),
        pendingTasks: this.tasks.filter(t => t.status === 'pending'),
        metrics: this.metrics
    };
}

sendToClient(client, data) {
    if (client.readyState === 1) {
        client.send(JSON.stringify(data));
    }
}

broadcastUpdate(data) {
    this.connectedClients.forEach(client => {
        this.sendToClient(client, data);
    });
}

initializeMetrics() {
    return {
        totalWorkflows: 0,
        activeWorkflows: 0,
        completedWorkflows: 0,
        totalCost: 0,
        performance: { successRate: 0 },
        costProjections: { monthly: 0 }
    };
}
```

**Modifier updateTaskStatus existant:**
```javascript
async updateTaskStatus(args) {
    // Code existant...
    const result = /* votre code actuel */;
    
    // Nouveau: Broadcast update
    this.broadcastUpdate({
        type: 'task_status_changed',
        data: { taskId: args.taskId, status: args.status, agent: args.agent }
    });
    
    return result;
}
```

### 4. Test de Connexion
```bash
# Redémarrer le serveur MCP
node index.js

# Vérifier que le WebSocket fonctionne
# Dans un navigateur, console développeur:
# new WebSocket('ws://localhost:8080')
```

### 5. Ouvrir le Dashboard
```bash
# Copier le dashboard dans un répertoire accessible
cp mcp-workspace/dashboard-live.html /path/to/web/directory/

# Ouvrir dans navigateur
open dashboard-live.html
# ou servir via un serveur web local
python -m http.server 3000
```

## Points de Vérification

### Connexion WebSocket
- [ ] Le serveur MCP démarre sans erreur
- [ ] Port 8080 est ouvert et accessible  
- [ ] Message "Dashboard client connected" apparaît dans les logs
- [ ] État de connexion "Connecté" dans le dashboard

### Données en Temps Réel
- [ ] Les workflows actifs apparaissent
- [ ] Les états des agents se mettent à jour
- [ ] Les métriques se rafraîchissent toutes les 5 secondes
- [ ] Les alertes s'affichent si pertinentes

## Dépannage

### Erreur "Cannot find module 'ws'"
```bash
npm install ws
```

### Erreur "Port 8080 already in use"
```javascript
// Dans setupWebSocketServer(), changer:
this.wsServer = new WebSocketServer({ port: 8081 });
// Et dans dashboard-live.html:
this.ws = new WebSocket('ws://localhost:8081');
```

### Dashboard ne se connecte pas
1. Vérifier que le serveur MCP fonctionne
2. Vérifier la console navigateur pour erreurs WebSocket  
3. Tester manuellement: `telnet localhost 8080`
4. Désactiver firewall/antivirus temporairement

### Pas de données dans le dashboard
1. Démarrer un workflow pour générer des données
2. Vérifier les logs serveur pour erreurs
3. Vérifier que les méthodes modifiées sont appelées

## Configuration Production

### Sécurité WebSocket
```javascript
// Ajouter authentification
this.wsServer.on('connection', (ws, req) => {
    const token = req.headers['authorization'];
    if (!this.validateToken(token)) {
        ws.close(1008, 'Unauthorized');
        return;
    }
    // Suite du code...
});
```

### Performance
```javascript
// Limiter le nombre de clients
if (this.connectedClients.size >= 10) {
    ws.close(1013, 'Too many connections');
    return;
}

// Throttling des mises à jour
this.lastBroadcast = this.lastBroadcast || 0;
if (Date.now() - this.lastBroadcast < 1000) return; // Max 1 update/sec
```

### Monitoring des Coûts
```javascript
// Adapter selon votre modèle de coût
updateCostMetrics() {
    const costPerTask = 0.05; // 5 centimes par tâche
    const costPerWorkflow = 0.50; // 50 centimes par workflow
    
    this.metrics.totalCost = 
        (this.metrics.totalTasks * costPerTask) + 
        (this.metrics.totalWorkflows * costPerWorkflow);
        
    // Alertes de budget
    if (this.metrics.costProjections.monthly > this.budgetLimit) {
        this.broadcastUpdate({
            type: 'cost_alert',
            data: { 
                message: 'Budget mensuel dépassé',
                currentCost: this.metrics.costProjections.monthly,
                budgetLimit: this.budgetLimit
            }
        });
    }
}
```

## Limitations Actuelles

### Fonctionnalités Manquantes
- Authentification des clients dashboard
- Persistance des métriques (base de données)
- Export des rapports (PDF/Excel)
- Alertes email/Slack
- Métriques de performance détaillées

### Considérations Techniques
- WebSocket non chiffré (utiliser WSS en production)
- Pas de reconnexion automatique robuste
- Métriques en mémoire uniquement (perdues au redémarrage)
- Pas de clustering multi-serveurs

## Extensibilité Future

### Intégrations Possibles
```javascript
// Base de données pour historique
const metrics = await db.getMetrics(timeRange);

// Notifications externes
await slack.sendAlert(alertMessage);
await email.sendReport(weeklyReport);

// API REST pour intégrations tierces
app.get('/api/metrics', (req, res) => {
    res.json(this.metrics);
});
```

Le système est fonctionnel mais nécessite ces adaptations pour s'intégrer à votre infrastructure existante. L'approche incrémentale permet de tester chaque composant individuellement.