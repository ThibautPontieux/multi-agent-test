import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  RefreshCw
} from 'lucide-react';
import type { LogEntry } from '@/types';

// Données mockées pour les logs
const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2025-08-30T19:45:32Z',
    level: 'info',
    message: 'Task completed successfully: MCP Dashboard implementation started',
    source: 'developer',
    context: {
      agentId: 'developer',
      taskId: '1756583074976',
      workflowId: '1756582632741'
    }
  },
  {
    id: '2',
    timestamp: '2025-08-30T19:44:15Z',
    level: 'info',
    message: 'Workflow auto-progressed: development-cycle step 1 → 2',
    source: 'orchestrator',
    context: {
      workflowId: '1756582632741'
    }
  },
  {
    id: '3',
    timestamp: '2025-08-30T19:43:20Z',
    level: 'warning',
    message: 'Agent workload approaching capacity: 90%',
    source: 'system',
    context: {
      agentId: 'developer',
      additionalData: { workload: 90 }
    }
  },
  {
    id: '4',
    timestamp: '2025-08-30T19:40:05Z',
    level: 'error',
    message: 'Git merge conflict detected in feature/dashboard branch',
    source: 'developer',
    context: {
      agentId: 'developer',
      taskId: '1756580365351-step-2',
      additionalData: { branch: 'feature/dashboard', conflictFiles: ['src/App.tsx'] }
    }
  },
  {
    id: '5',
    timestamp: '2025-08-30T19:37:12Z',
    level: 'info',
    message: 'New workflow started: MCP-Monitoring-Dashboard development cycle',
    source: 'orchestrator',
    context: {
      workflowId: '1756582632741'
    }
  },
  {
    id: '6',
    timestamp: '2025-08-30T19:35:00Z',
    level: 'debug',
    message: 'WebSocket connection established for real-time monitoring',
    source: 'system'
  }
];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isLiveMode, setIsLiveMode] = useState(true);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
    return matchesSearch && matchesLevel && matchesSource;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-danger-700 bg-danger-100 border-danger-200';
      case 'warning': return 'text-warning-700 bg-warning-100 border-warning-200';
      case 'info': return 'text-primary-700 bg-primary-100 border-primary-200';
      case 'debug': return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      case 'debug': return Bug;
      default: return Info;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    };
  };

  const sources = [...new Set(logs.map(log => log.source))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logs système</h2>
          <p className="text-gray-600">
            Historique détaillé des activités et événements
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="liveMode"
              checked={isLiveMode}
              onChange={(e) => setIsLiveMode(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="liveMode" className="text-sm text-gray-700">
              Mode temps réel
            </label>
            {isLiveMode && <div className="status-dot status-online"></div>}
          </div>
          
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['error', 'warning', 'info', 'debug'].map((level) => {
          const count = logs.filter(log => log.level === level).length;
          const LevelIcon = getLevelIcon(level);
          
          return (
            <div key={level} className="dashboard-card text-center">
              <LevelIcon className={`w-8 h-8 mx-auto mb-2 ${
                level === 'error' ? 'text-danger-600' :
                level === 'warning' ? 'text-warning-600' :
                level === 'info' ? 'text-primary-600' :
                'text-gray-600'
              }`} />
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 capitalize">{level}</p>
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="dashboard-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            >
              <option value="all">Tous les niveaux</option>
              <option value="error">Erreurs</option>
              <option value="warning">Avertissements</option>
              <option value="info">Informations</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            >
              <option value="all">Toutes les sources</option>
              {sources.map(source => (
                <option key={source} value={source} className="capitalize">
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="dashboard-card">
        <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredLogs.map((log, index) => {
            const LevelIcon = getLevelIcon(log.level);
            const formatted = formatTimestamp(log.timestamp);
            
            return (
              <div 
                key={log.id} 
                className={`flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  index === 0 && isLiveMode ? 'bg-primary-50 border border-primary-200' : ''
                }`}
              >
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <LevelIcon className={`w-4 h-4 ${
                    log.level === 'error' ? 'text-danger-600' :
                    log.level === 'warning' ? 'text-warning-600' :
                    log.level === 'info' ? 'text-primary-600' :
                    'text-gray-600'
                  }`} />
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">
                    {log.message}
                  </p>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>Source: <strong className="text-gray-700 capitalize">{log.source}</strong></span>
                    {log.context?.taskId && (
                      <span>Tâche: <strong className="text-gray-700">{log.context.taskId.slice(-8)}</strong></span>
                    )}
                    {log.context?.workflowId && (
                      <span>Workflow: <strong className="text-gray-700">{log.context.workflowId.slice(-8)}</strong></span>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-gray-500">{formatted.time}</div>
                  <div className="text-xs text-gray-400">{formatted.date}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun log trouvé</h3>
            <p className="text-gray-500">
              Aucun log ne correspond aux critères de filtrage sélectionnés.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
