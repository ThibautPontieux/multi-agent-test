import React, { useState } from 'react';
import { 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  X,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import type { Alert } from '@/types';

// Données mockées pour les alertes
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'Agent Developer surchargé',
    message: 'L\'agent Developer atteint 95% de sa capacité de charge. Risque de dégradation des performances.',
    timestamp: '2025-08-30T19:45:00Z',
    isRead: false,
    source: 'system',
    actionRequired: true,
    relatedEntity: {
      type: 'agent',
      id: 'developer',
      name: 'Agent Developer'
    }
  },
  {
    id: '2',
    type: 'error',
    title: 'Conflit Git détecté',
    message: 'Conflit de merge détecté dans la branche feature/dashboard. Intervention manuelle requise.',
    timestamp: '2025-08-30T19:40:05Z',
    isRead: false,
    source: 'developer',
    actionRequired: true,
    relatedEntity: {
      type: 'workflow',
      id: '1756580365351',
      name: 'Bug Fix - Calculator Clear Button'
    }
  },
  {
    id: '3',
    type: 'warning',
    title: 'Workflow en pause prolongée',
    message: 'Le workflow "Feature Request - User Authentication" est en pause depuis plus de 2 heures.',
    timestamp: '2025-08-30T17:30:00Z',
    isRead: true,
    source: 'orchestrator',
    actionRequired: false,
    relatedEntity: {
      type: 'workflow',
      id: '1756575000000',
      name: 'Feature Request - User Authentication'
    }
  },
  {
    id: '4',
    type: 'info',
    title: 'Nouveau workflow créé',
    message: 'Un nouveau workflow de développement a été démarré pour le projet MCP-Monitoring-Dashboard.',
    timestamp: '2025-08-30T19:37:12Z',
    isRead: true,
    source: 'orchestrator',
    actionRequired: false,
    relatedEntity: {
      type: 'workflow',
      id: '1756582632741',
      name: 'Development Cycle - MCP Monitoring Dashboard'
    }
  },
  {
    id: '5',
    type: 'warning',
    title: 'Taux d\'erreur en hausse',
    message: 'Le taux d\'erreur global du système a augmenté à 2.1% au cours de la dernière heure.',
    timestamp: '2025-08-30T18:45:00Z',
    isRead: true,
    source: 'system',
    actionRequired: false
  }
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<string>('all');

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.isRead;
    if (filter === 'critical') return alert.type === 'critical';
    if (filter === 'actionRequired') return alert.actionRequired;
    return true;
  });

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-l-danger-500 bg-danger-50';
      case 'error': return 'border-l-danger-400 bg-danger-25';
      case 'warning': return 'border-l-warning-500 bg-warning-50';
      case 'info': return 'border-l-primary-500 bg-primary-50';
      default: return 'border-l-gray-300 bg-gray-50';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return AlertCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Bell;
    }
  };

  const getAlertIconColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-danger-600';
      case 'error': return 'text-danger-500';
      case 'warning': return 'text-warning-600';
      case 'info': return 'text-primary-600';
      default: return 'text-gray-500';
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const markAsUnread = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, isRead: false } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, isRead: true })));
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ${diffInMinutes % 60}min`;
    return `${Math.floor(hours / 24)}j`;
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;
  const criticalCount = alerts.filter(alert => alert.type === 'critical').length;
  const actionRequiredCount = alerts.filter(alert => alert.actionRequired).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">Alertes</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-danger-100 text-danger-700 rounded-full">
                {unreadCount} non lues
              </span>
            )}
          </div>
          <p className="text-gray-600">
            Notifications et alertes système
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="btn-secondary text-sm"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-danger-100 rounded-full">
              <AlertCircle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Critiques</p>
              <p className="text-xl font-bold text-gray-900">{criticalCount}</p>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-100 rounded-full">
              <Bell className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Non lues</p>
              <p className="text-xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Action requise</p>
              <p className="text-xl font-bold text-gray-900">{actionRequiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="dashboard-card">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Toutes', count: alerts.length },
            { key: 'unread', label: 'Non lues', count: unreadCount },
            { key: 'critical', label: 'Critiques', count: criticalCount },
            { key: 'actionRequired', label: 'Action requise', count: actionRequiredCount }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === key
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const AlertIcon = getAlertIcon(alert.type);
          
          return (
            <div 
              key={alert.id} 
              className={`border-l-4 rounded-lg shadow-sm transition-all hover:shadow-md ${
                getAlertColor(alert.type)
              } ${!alert.isRead ? 'ring-2 ring-primary-100' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertIcon className={`w-5 h-5 mt-0.5 ${getAlertIconColor(alert.type)}`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`font-semibold ${!alert.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {alert.title}
                        </h3>
                        {!alert.isRead && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                        )}
                        {alert.actionRequired && (
                          <span className="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-700 rounded">
                            Action requise
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-sm ${!alert.isRead ? 'text-gray-800' : 'text-gray-600'} mb-3`}>
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Source: <strong className="text-gray-700 capitalize">{alert.source}</strong></span>
                        <span>•</span>
                        <span>{formatTimestamp(alert.timestamp)}</span>
                        {alert.relatedEntity && (
                          <>
                            <span>•</span>
                            <span>
                              {alert.relatedEntity.type === 'agent' && 'Agent: '}
                              {alert.relatedEntity.type === 'workflow' && 'Workflow: '}
                              {alert.relatedEntity.type === 'task' && 'Tâche: '}
                              <strong className="text-gray-700">{alert.relatedEntity.name}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {alert.isRead ? (
                      <button
                        onClick={() => markAsUnread(alert.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Marquer comme non lu"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Marquer comme lu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1 text-gray-400 hover:text-danger-600"
                      title="Supprimer l'alerte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si aucune alerte */}
      {filteredAlerts.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'Aucune alerte' : `Aucune alerte ${
              filter === 'unread' ? 'non lue' :
              filter === 'critical' ? 'critique' :
              filter === 'actionRequired' ? 'nécessitant une action' :
              ''
            }`}
          </h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'Tout va bien ! Aucune alerte système détectée.'
              : 'Modifiez les filtres pour voir d\'autres alertes.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
