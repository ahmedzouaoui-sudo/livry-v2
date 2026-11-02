import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  RefreshCw,
  Clock,
  Activity,
  Copy,
  Check,
  Search,
  Filter,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatUsageDuration,
  formatDateTime,
  formatRelativeTime,
} from '../services/deviceTrackerService';
import { triggerHaptic } from '../utils/haptics';

interface UserDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserDevicesModal: React.FC<UserDevicesModalProps> = ({ isOpen, onClose }) => {
  const { userDevices, deviceStats, refreshUserDevices, isLoadingDevices, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ONLINE' | 'MOBILE' | 'DESKTOP'>('ALL');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // Auto-refresh when modal is open every 15 seconds
  useEffect(() => {
    if (!isOpen) return;
    refreshUserDevices();
    const interval = setInterval(() => {
      refreshUserDevices();
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, refreshUserDevices]);

  // Copy IP helper
  const handleCopyIp = (ip: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    showToast(`Adresse IP ${ip} copiée !`);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Filtered devices list
  const filteredDevices = useMemo(() => {
    return userDevices.filter((d) => {
      // Type filter
      if (filterType === 'ONLINE' && !d.is_online) return false;
      if (filterType === 'MOBILE' && !d.device_type.includes('Mobile') && !d.device_type.includes('iPhone') && !d.device_type.includes('Android')) return false;
      if (filterType === 'DESKTOP' && (d.device_type.includes('Mobile') || d.device_type.includes('Tablette'))) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        d.ip_address.toLowerCase().includes(q) ||
        d.device_type.toLowerCase().includes(q) ||
        (d.device_brand && d.device_brand.toLowerCase().includes(q)) ||
        d.device_id.toLowerCase().includes(q)
      );
    });
  }, [userDevices, filterType, searchQuery]);

  if (!isOpen) return null;

  const sqlQueryExample = `SELECT 
  device_id,
  ip_address,
  device_type,
  device_brand,
  first_seen_at,
  last_active_at,
  ROUND(total_time_seconds / 60.0, 1) AS minutes_utilisees,
  visits_count,
  is_online
FROM public.user_devices
ORDER BY last_active_at DESC;`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
        
        {/* 1. Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  Téléphones & Activité Utilisateurs
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold">
                  table: user_devices
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Enregistrement automatique de chaque téléphone entrant et de son temps d'utilisation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                refreshUserDevices();
              }}
              disabled={isLoadingDevices}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-xs font-bold text-gray-700 dark:text-slate-200 transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          {/* Card 1: Total Devices */}
          <div className="p-3 rounded-[16px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Téléphones</span>
              <Smartphone className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {deviceStats?.totalDevices ?? userDevices.length}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">
              {deviceStats?.mobileCount || 0} mobiles • {deviceStats?.desktopCount || 0} PC
            </span>
          </div>

          {/* Card 2: Online Now */}
          <div className="p-3 rounded-[16px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">En Ligne</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span>{deviceStats?.onlineDevices ?? 0}</span>
              {deviceStats && deviceStats.onlineDevices > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
              Actifs ces 2 dernières min
            </span>
          </div>

          {/* Card 3: Total Time */}
          <div className="p-3 rounded-[16px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Temps Cumulé</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate">
              {formatUsageDuration(deviceStats?.totalTimeSeconds ?? 0)}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">
              Temps d'utilisation total
            </span>
          </div>

          {/* Card 4: Total Visits */}
          <div className="p-3 rounded-[16px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Visites</span>
              <Zap className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {userDevices.reduce((sum, d) => sum + (d.visits_count || 1), 0)}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">
              Sessions enregistrées
            </span>
          </div>
        </div>

        {/* 3. Filter & Search Controls */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-white dark:bg-slate-900">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par adresse IP, modèle, type..."
              className="w-full pl-9 pr-3 py-1.5 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-[10px] text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              Tous ({userDevices.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ONLINE')}
              className={`px-3 py-1 rounded-[10px] text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'ONLINE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              🟢 En ligne ({deviceStats?.onlineDevices || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('MOBILE')}
              className={`px-3 py-1 rounded-[10px] text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'MOBILE'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              Smartphones ({deviceStats?.mobileCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DESKTOP')}
              className={`px-3 py-1 rounded-[10px] text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'DESKTOP'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              Ordinateurs ({deviceStats?.desktopCount || 0})
            </button>
          </div>
        </div>

        {/* 4. Table / Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {filteredDevices.length > 0 ? (
            <div className="overflow-x-auto rounded-[16px] border border-gray-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 sm:px-4">Statut</th>
                    <th className="py-3 px-3 sm:px-4">Téléphone / Appareil</th>
                    <th className="py-3 px-3 sm:px-4">Adresse IP</th>
                    <th className="py-3 px-3 sm:px-4">Première entrée</th>
                    <th className="py-3 px-3 sm:px-4">Dernière activité</th>
                    <th className="py-3 px-3 sm:px-4">Temps d'utilisation</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Visites</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredDevices.map((device) => {
                    const isMobile =
                      device.device_type.includes('Mobile') ||
                      device.device_type.includes('iPhone') ||
                      device.device_type.includes('Android');

                    return (
                      <tr
                        key={device.device_id}
                        className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        {/* Status */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          {device.is_online ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>En ligne</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                              <span className="w-2 h-2 rounded-full bg-gray-400" />
                              <span>Hors ligne</span>
                            </span>
                          )}
                        </td>

                        {/* Device & Brand */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[10px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                              {isMobile ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Monitor className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 dark:text-white">
                                {device.device_brand || device.device_type}
                              </div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                <span>{device.device_type}</span>
                                <span>•</span>
                                <span className="font-mono">{device.screen_size}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleCopyIp(device.ip_address)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded-[8px] bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 transition cursor-pointer select-none"
                            title="Cliquer pour copier l'IP"
                          >
                            <span>{device.ip_address}</span>
                            {copiedIp === device.ip_address ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        </td>

                        {/* First Seen */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-gray-600 dark:text-slate-300">
                          <div className="font-medium">{formatDateTime(device.first_seen_at)}</div>
                          <div className="text-[10px] text-gray-400">
                            {formatRelativeTime(device.first_seen_at)}
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {formatRelativeTime(device.last_active_at)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {formatDateTime(device.last_active_at)}
                          </div>
                        </td>

                        {/* Total Usage Time */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-black">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{formatUsageDuration(device.total_time_seconds)}</span>
                          </span>
                        </td>

                        {/* Visits Count */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0759A4] dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 font-mono text-[11px]">
                            {device.visits_count}x
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400 space-y-2">
              <Smartphone className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
              <p className="text-sm font-bold">Aucun téléphone trouvé</p>
              <p className="text-xs">
                Chaque utilisateur qui ouvre l'application est automatiquement enregistré dans la table Supabase `user_devices`.
              </p>
            </div>
          )}

          {/* 5. SQL Reference Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>
                {showSqlGuide
                  ? 'Masquer le code SQL de la table user_devices'
                  : 'Afficher la commande SQL pour requêter cette table dans Supabase'}
              </span>
            </button>

            {showSqlGuide && (
              <div className="mt-3 p-3 bg-gray-900 rounded-[14px] text-gray-100 text-xs font-mono relative border border-gray-800">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase">
                    Exemple de requête SQL dans Supabase Dashboard
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      navigator.clipboard.writeText(sqlQueryExample);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-sans"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copié !' : 'Copier SQL'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-400">
                  {sqlQueryExample}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 6. Footer Modal Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 shrink-0">
          <span>
            {filteredDevices.length} appareil{filteredDevices.length > 1 ? 's' : ''} affiché{filteredDevices.length > 1 ? 's' : ''} sur {userDevices.length}
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-1.5 rounded-[10px] bg-gray-900 dark:bg-slate-700 text-white font-bold text-xs hover:bg-black transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
