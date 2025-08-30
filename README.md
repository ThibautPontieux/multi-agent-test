# 🤖 MCP Monitoring Dashboard

## Vue d'ensemble

Dashboard de monitoring en temps réel pour les agents MCP (Model Context Protocol) autonomes. Interface moderne React/TypeScript permettant de superviser, gérer et optimiser vos workflows d'IA collaborative.

## ✨ Fonctionnalités principales

### 🏠 **Dashboard Central**
- **Métriques temps réel** - Vue d'ensemble des performances système
- **Graphiques interactifs** - Visualisation des données avec Recharts
- **Indicateurs de santé** - Monitoring continu des agents
- **Alertes visuelles** - Notifications immédiates des problèmes

### 👥 **Gestion des Agents**
- **État des agents** - Online, Busy, Offline, Error
- **Métriques de performance** - Taux de réussite, temps moyen, charge
- **Capacités dynamiques** - Compétences et spécialisations
- **Historique d'activité** - Suivi détaillé des actions

### 🔄 **Workflows Autonomes**
- **Suivi en temps réel** - Progression des workflows actifs
- **Types multiples** - Development, Bug-fix, Feature-request, Code-review
- **Coordination automatique** - Handoffs entre agents
- **Intégration Git** - Branches, commits, PRs automatiques

### 📊 **Logs & Monitoring**
- **Logs temps réel** - Filtrage par niveau et source
- **Export de données** - Téléchargement des historiques
- **Recherche avancée** - Filtres multiples et recherche textuelle
- **Rétention configurable** - Gestion automatique des données

### 🚨 **Système d'Alertes**
- **Alertes intelligentes** - Critical, Warning, Info
- **Notifications desktop** - Support natif navigateur
- **Actions suggérées** - Recommandations automatiques
- **Gestion d'état** - Lu/non-lu, archivage

### ⚙️ **Configuration Avancée**
- **Thèmes multiples** - Clair, sombre, système
- **Intervalles personnalisables** - Fréquence de mise à jour
- **Notifications audio** - Alertes sonores
- **Rétention des données** - Politique de conservation

## 🏗️ Architecture Technique

### **Stack Frontend**
```typescript
- React 18 + TypeScript
- Tailwind CSS (styling responsive)
- React Router (navigation)
- Recharts (graphiques)
- Lucide React (icônes)
- Vite (build tool)
```

### **Features Avancées**
- **WebSocket temps réel** - Mises à jour instantanées
- **Responsive design** - Mobile, tablet, desktop
- **Progressive Enhancement** - Fonctionnement offline partiel
- **Type Safety** - TypeScript strict mode
- **Performance optimisée** - Lazy loading, memoization

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   └── Layout.tsx      # Layout principal avec navigation
├── pages/              # Pages de l'application
│   ├── HomePage.tsx    # Dashboard principal
│   ├── AgentsPage.tsx  # Gestion des agents
│   ├── WorkflowsPage.tsx # Suivi des workflows
│   ├── LogsPage.tsx    # Logs système
│   ├── AlertsPage.tsx  # Centre d'alertes
│   └── SettingsPage.tsx # Configuration
├── hooks/              # Custom React hooks
│   └── useWebSocket.ts # Hook WebSocket réutilisable
├── types/              # Définitions TypeScript
│   └── index.ts        # Types pour agents, workflows, etc.
├── utils/              # Utilitaires
│   ├── api.ts          # Client API MCP
│   └── helpers.ts      # Fonctions utilitaires
└── styles/
    └── index.css       # Styles globaux et composants
```

## 🚀 Installation & Démarrage

### **Prérequis**
```bash
- Node.js 18+
- npm ou yarn
- Agent MCP configuré
```

### **Installation**
```bash
# Cloner le repository
git clone <repository-url>
cd mcp-monitoring-dashboard

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build de production
npm run build
```

### **Configuration**
```typescript
// Configurer l'URL de l'API MCP
const API_BASE_URL = process.env.VITE_API_URL || '/api';

// WebSocket pour le temps réel
const WS_URL = process.env.VITE_WS_URL || 'ws://localhost:8080';
```

## 🔌 Intégration MCP

### **API Endpoints Requis**
```typescript
GET  /api/agents           # Liste des agents
GET  /api/agents/:id       # Détails d'un agent
PUT  /api/agents/:id/status # Mise à jour statut

GET  /api/tasks            # Liste des tâches
POST /api/tasks            # Créer une tâche
PUT  /api/tasks/:id/status # Mettre à jour statut

GET  /api/workflows        # Liste des workflows
POST /api/workflows        # Démarrer un workflow
PUT  /api/workflows/:id/pause # Pause/Resume

GET  /api/logs             # Logs système
GET  /api/alerts           # Alertes actives
GET  /api/system/metrics   # Métriques système
```

### **WebSocket Events**
```typescript
// Événements entrants
'agent_update'     # Mise à jour agent
'task_update'      # Changement de tâche
'workflow_update'  # Progression workflow
'system_metrics'   # Nouvelles métriques
'log_entry'        # Nouveau log
'alert'            # Nouvelle alerte

// Événements sortants
'subscribe'        # S'abonner aux mises à jour
'unsubscribe'      # Se désabonner
```

## 🎨 Design System

### **Palette de Couleurs**
```css
/* Couleurs primaires */
--primary-50: #eff6ff
--primary-500: #3b82f6
--primary-600: #2563eb

/* Status */
--success-500: #22c55e   /* Online, Completed */
--warning-500: #f59e0b   /* Busy, Warning */
--danger-500: #ef4444    /* Error, Critical */
--gray-500: #6b7280      /* Offline, Neutral */
```

### **Composants Réutilisables**
- **Cards** - `.dashboard-card`, `.metric-card`
- **Buttons** - `.btn-primary`, `.btn-secondary`, `.btn-success`
- **Status** - `.status-dot`, `.status-online`, `.status-busy`
- **Animations** - `animate-pulse-slow`, `animate-bounce-slow`

## 📱 Responsive Design

### **Breakpoints**
```css
sm: 640px   # Mobile large
md: 768px   # Tablet
lg: 1024px  # Desktop
xl: 1280px  # Large desktop
```

### **Adaptations Mobile**
- **Navigation collapse** - Sidebar mobile avec overlay
- **Cards empilées** - Layout vertical sur mobile
- **Touch-friendly** - Boutons et interactions adaptés
- **Performance** - Images optimisées, lazy loading

## 🔧 Développement

### **Scripts Disponibles**
```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run preview  # Aperçu du build
npm run lint     # Linting ESLint
```

### **Standards de Code**
- **ESLint** - Linting JavaScript/TypeScript
- **Prettier** - Formatage automatique du code
- **TypeScript strict** - Type checking complet
- **CSS modules** - Styles scopés par composant

### **Tests** (À implémenter)
```bash
npm run test        # Tests unitaires (Jest)
npm run test:e2e    # Tests E2E (Playwright)
npm run test:watch  # Mode watch
```

## 🚀 Déploiement

### **Build de Production**
```bash
# Build optimisé
npm run build

# Fichiers de sortie dans /dist
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other-assets]
```

### **Configuration Serveur**
```nginx
# Nginx example
server {
    listen 80;
    server_name dashboard.example.com;
    
    root /path/to/dist;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://mcp-server:8080;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://mcp-server:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🎯 Roadmap

### **Version 1.1** (À venir)
- [ ] **Tests automatisés** - Unit + E2E tests
- [ ] **Mode sombre complet** - Thème sombre avancé
- [ ] **Export PDF** - Rapports exportables
- [ ] **Historique détaillé** - Timeline des événements

### **Version 1.2** (Futur)
- [ ] **Multi-tenancy** - Support multi-organisation
- [ ] **API GraphQL** - Query flexible des données
- [ ] **Plugins système** - Extensions tierces
- [ ] **ML Insights** - Prédictions IA

### **Version 2.0** (Vision)
- [ ] **Orchestration avancée** - Workflows complexes
- [ ] **Scaling automatique** - Auto-scaling des agents
- [ ] **Marketplace** - Store d'agents spécialisés
- [ ] **Compliance** - Audit trails, GDPR

## 🤝 Contribution

### **Comment Contribuer**
1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Commit** les changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

### **Standards**
- **Code style** - Suivre ESLint/Prettier
- **Commits** - Messages conventionnels
- **Tests** - Ajouter tests pour nouvelles features
- **Documentation** - Mettre à jour README si nécessaire

## 📄 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **React Team** - Framework exceptionnel
- **Tailwind CSS** - Système de design moderne
- **Lucide** - Icônes élégantes et cohérentes
- **Recharts** - Graphiques React performants

---

**Créé par Agent Developer** - Implémentation autonome dans le cadre du système MCP IA collaboratif

*Dernière mise à jour: 2025-08-30*
