import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, Filter, IoCheckmark as Check, IoCheckmarkCircle, IoClose as X, IoCloseCircle, IoCloudDownload, IoFilter, IoSearch, IoShield, IoWarning, Search } from 'react-icons/io5';
const API = 'https://coinhubx.net/api';

// API already defined

export default function AdminSecurityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: 'all',
    success: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successfulLogins: 0,
    failedLogins: 0,
    newDevices: 0
  });

  useEffect(() => {
    loadSecurityLogs();
  }, [filters]);

  const loadSecurityLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/admin/security-logs`, {
        params: filters
      });
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Failed to load security logs:', error);
      toast.error('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportLogs = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/security-logs/export`, {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `security_logs_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Logs exported successfully');
    } catch (error) {
      console.error('Failed to export logs:', error);
      toast.error('Failed to export logs');
    }
  };

  const getStatusIcon = (success) => {
    return success ? (
      <IoCheckmarkCircle className="w-5 h-5 text-green-400" />
    ) : (
      <IoCloseCircle className="w-5 h-5 text-red-400" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <IoShield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Security Logs</h1>
          </div>
          <p className="text-gray-400">Monitor all login attempts and security events</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Attempts</div>
            <div className="text-3xl font-bold text-white">{stats.totalAttempts}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Successful</div>
            <div className="text-3xl font-bold text-green-400">{stats.successfulLogins}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Failed</div>
            <div className="text-3xl font-bold text-red-400">{stats.failedLogins}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">New Devices</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.newDevices}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <IoFilter className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All Events</option>
                <option value="login">Login</option>
                <option value="signup">Signup</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={filters.success}
                onChange={(e) => handleFilterChange('success', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Search</label>
              <div className="relative">
                <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Email or IP"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors"
            >
              <IoCloudDownload className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.success)}
                          {log.is_new_device && (
                            <IoWarning className="w-4 h-4 text-yellow-400" title="New Device" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-900/50 text-cyan-300">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{log.email}</div>
                        {log.failure_reason && (
                          <div className="text-xs text-red-400 mt-1">{log.failure_reason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono text-sm">{log.ip_address}</td>
                      <td className="px-6 py-4 text-gray-300">
                        {log.city}, {log.country}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white text-sm">{log.browser} on {log.os}</div>
                        <div className="text-xs text-gray-400">{log.device_type}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
