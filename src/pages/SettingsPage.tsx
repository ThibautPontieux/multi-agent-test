import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Bell, 
  Monitor, 
  Moon, 
  Sun,
  Volume2,
  VolumeX,
  Database,
  Wifi,
  Shield
} from 'lucide-react';
import type { DashboardConfig } from '@/types';

const defaultConfig: DashboardConfig = {
  refreshInterval: 30,
  maxLogsDisplayed: 100,
  enableRealTimeUpdates: true,
  alertsRetentionDays: 7,
  theme: 'light',
  notifications: {
    desktop: true,
    sounds: true,
    criticalOnly: false
  }
};

export default function SettingsPage() {
  const [config, setConfig] = useState<DashboardConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateConfig = (updates: Partial<DashboardConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateNotifications = (updates: Partial<DashboardConfig['notifications']>) => {
    setConfig(prev => ({ 
      ...prev, 
      notifications: { ...prev.notifications, ...updates }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulation d'une sauvegarde
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
    }, 1000);
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paramètres</h2>
          <p className="text-gray-600">
            Configuration du dashboard et des notifications
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleReset}
              className="btn-secondary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      {/* Section Affichage */}
      <div className="dashboard-card">
        <div className="flex items-center space-x-3 mb-6">
          <Monitor className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Affichage</h3>
        </div>
        
        <div className="space-y-6">
          {/* Thème */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Thème de l'interface
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Clair', icon: Sun },
                { value: 'dark', label: 'Sombre', icon: Moon },
                { value: 'system', label: 'Système', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateConfig({ theme: value as DashboardConfig['theme'] })}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                    config.theme === value
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intervalle de rafraîchissement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalle de rafraîchissement (secondes)
            </label>
            <select
              value={config.refreshInterval}
              onChange={(e) => updateConfig({ refreshInterval: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={10}>10 secondes</option>
              <option value={30}>30 secondes</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>

          {/* Nombre maximum de logs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre maximum de logs affichés
            </label>
            <input
              type="number"
              min="50"
              max="1000"
              step="50"
              value={config.maxLogsDisplayed}
              onChange={(e) => updateConfig({ maxLogsDisplayed: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Section Temps réel */}
      <div className="dashboard-card">
        <div className="flex items-center space-x-3 mb-6">
          <Wifi className="w-6 h-6 text-success-600" />
          <h3 className="text-lg font-semibold text-gray-900">Temps réel</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Mises à jour en temps réel</h4>
              <p className="text-sm text-gray-500">
                Recevoir automatiquement les mises à jour via WebSocket
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableRealTimeUpdates}
                onChange={(e) => updateConfig({ enableRealTimeUpdates: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Section Notifications */}
      <div className="dashboard-card">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-6 h-6 text-warning-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Notifications desktop</h4>
              <p className="text-sm text-gray-500">
                Afficher les notifications dans le navigateur
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.notifications.desktop}
                onChange={(e) => updateNotifications({ desktop: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {config.notifications.sounds ? (
                <Volume2 className="w-5 h-5 text-gray-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-900">Sons de notification</h4>
                <p className="text-sm text-gray-500">
                  Jouer un son lors des alertes importantes
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.notifications.sounds}
                onChange={(e) => updateNotifications({ sounds: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Alertes critiques uniquement</h4>
              <p className="text-sm text-gray-500">
                Ne notifier que pour les alertes critiques et erreurs
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.notifications.criticalOnly}
                onChange={(e) => updateNotifications({ criticalOnly: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Section Données */}
      <div className="dashboard-card">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Gestion des données</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rétention des alertes (jours)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.alertsRetentionDays}
              onChange={(e) => updateConfig({ alertsRetentionDays: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Les alertes plus anciennes seront automatiquement supprimées
            </p>
          </div>
        </div>
      </div>

      {/* Section Sécurité */}
      <div className="dashboard-card">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sécurité</h3>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              État de la connexion MCP
            </h4>
            <div className="flex items-center space-x-2">
              <div className="status-dot status-online"></div>
              <span className="text-sm text-gray-700">Connexion sécurisée établie</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Dernière vérification: {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>
          
          <div className="text-center">
            <button className="btn-secondary">
              Tester la connexion
            </button>
          </div>
        </div>
      </div>

      {/* Avertissement si changements non sauvegardés */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-warning-50 border border-warning-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-warning-600" />
            <span className="text-sm font-medium text-warning-800">
              Modifications non sauvegardées
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
