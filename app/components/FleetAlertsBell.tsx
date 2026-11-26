'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, AlertCircle, Wrench, CheckCheck, Check, RefreshCw, X, ArrowRight, ShieldAlert } from 'lucide-react'
import Cookies from 'js-cookie'
import api from "@/lib/axios"

export interface FleetAlertItem {
  id: number
  car_id: number
  registration: string
  model: string
  alert_type: 'mot_expired' | 'mot_warning' | 'tax_expired' | 'tax_warning' | 'service_due'
  severity: 'expired' | 'warning' | 'service'
  title: string
  message: string
  status: 'active' | 'resolved'
  created_at: string
  is_read: boolean
  is_cleared: boolean
  read_at?: string
}

interface FleetAlertsBellProps {
  onSelectCar?: (regNo: string) => void
  onServiceDone?: (carId: number) => Promise<void> | void
  refreshTrigger?: number
}

type TabFilter = 'all' | 'expired' | 'warning' | 'service'

export default function FleetAlertsBell({ onSelectCar, onServiceDone, refreshTrigger }: FleetAlertsBellProps) {
  const [alerts, setAlerts] = useState<FleetAlertItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [lastScanAt, setLastScanAt] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [markingReadId, setMarkingReadId] = useState<number | null>(null)
  const [servicingCarId, setServicingCarId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 1. Get user ID from cookies on mount
  useEffect(() => {
    const userData = Cookies.get('user')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.id) {
          setUserId(parsed.id)
          fetchAlerts(parsed.id, false)
        }
      } catch (err) {
        console.error("Failed to parse user cookie", err)
      }
    }
  }, [])

  // Re-fetch when refreshTrigger updates
  useEffect(() => {
    if (userId) {
      fetchAlerts(userId, false)
    }
  }, [refreshTrigger])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const fetchAlerts = async (uid: number, force: boolean = false) => {
    if (force) setIsSyncing(true)
    try {
      const res = await api.get(`/api/fleet/alerts?user_id=${uid}${force ? '&force=true' : ''}`, {
        headers: { requiresAuth: true }
      })
      if (res.data?.success && res.data?.data) {
        setAlerts(res.data.data.alerts || [])
        setTotalCount(res.data.data.total_count || 0)
        setUnreadCount(res.data.data.unread_count || 0)
        setLastScanAt(res.data.data.last_scan_at || null)
      }
    } catch (err) {
      console.error("Failed to fetch fleet alerts:", err)
    } finally {
      if (force) setIsSyncing(false)
    }
  }

  const markSingleRead = async (alertId: number) => {
    if (!userId) return
    setMarkingReadId(alertId)
    try {
      await api.patch(`/api/fleet/alerts/${alertId}/users/${userId}/read`, {}, {
        headers: { requiresAuth: true }
      })
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    } finally {
      setMarkingReadId(null)
    }
  }

  const markAllRead = async () => {
    if (!userId) return
    try {
      await api.patch(`/api/fleet/alerts/users/${userId}/read-all`, {}, {
        headers: { requiresAuth: true }
      })
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Failed to mark all alerts as read:", err)
    }
  }

  const handleMarkServiced = async (carId: number, alertId: number) => {
    if (!onServiceDone) return
    setServicingCarId(carId)
    try {
      await onServiceDone(carId)
      // Auto-remove or mark alert as resolved in local list
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      setTotalCount(prev => Math.max(0, prev - 1))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Failed to mark vehicle serviced:", err)
    } finally {
      setServicingCarId(null)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'expired') return a.severity === 'expired'
    if (activeTab === 'warning') return a.severity === 'warning'
    if (activeTab === 'service') return a.severity === 'service'
    return true
  })

  const expiredCount = alerts.filter(a => a.severity === 'expired').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const serviceCount = alerts.filter(a => a.severity === 'service').length

  const formatLastScan = (isoStr: string | null) => {
    if (!isoStr) return "Never"
    try {
      const d = new Date(isoStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
    } catch {
      return "Recently"
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative flex items-center gap-2 px-3.5 py-2 text-sm rounded-lg border transition font-medium shadow-sm ${
          unreadCount > 0
            ? "bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100"
            : totalCount > 0
            ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
        }`}
        title="Fleet Alerts (MOT, Tax, Service)"
      >
        <div className="relative">
          <Bell
            size={16}
            className={unreadCount > 0 ? "text-amber-600 animate-wiggle" : "text-gray-500"}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </div>
        <span className="text-xs font-semibold">Alerts</span>
        {totalCount > 0 && (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none ${
              unreadCount > 0
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700 border border-gray-200"
            }`}
          >
            {unreadCount > 0 ? unreadCount : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-[550px] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400" />
              <div>
                <h3 className="text-sm font-bold leading-tight">Fleet Alerts</h3>
                <p className="text-[11px] text-gray-300">
                  {unreadCount > 0 ? `${unreadCount} unread issue${unreadCount !== 1 ? 's' : ''}` : "All issues reviewed"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition flex items-center gap-1 font-medium"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50/70 text-xs px-2 pt-1 gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 font-medium rounded-t-md transition border-b-2 ${
                activeTab === 'all'
                  ? "border-emerald-600 text-emerald-700 bg-white shadow-xs font-semibold"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('expired')}
              className={`px-3 py-1.5 font-medium rounded-t-md transition border-b-2 flex items-center gap-1 ${
                activeTab === 'expired'
                  ? "border-red-600 text-red-700 bg-white shadow-xs font-semibold"
                  : "border-transparent text-gray-600 hover:text-red-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
              Expired ({expiredCount})
            </button>
            <button
              onClick={() => setActiveTab('warning')}
              className={`px-3 py-1.5 font-medium rounded-t-md transition border-b-2 flex items-center gap-1 ${
                activeTab === 'warning'
                  ? "border-amber-500 text-amber-700 bg-white shadow-xs font-semibold"
                  : "border-transparent text-gray-600 hover:text-amber-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              Due Soon ({warningCount})
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-3 py-1.5 font-medium rounded-t-md transition border-b-2 flex items-center gap-1 ${
                activeTab === 'service'
                  ? "border-blue-600 text-blue-700 bg-white shadow-xs font-semibold"
                  : "border-transparent text-gray-600 hover:text-blue-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
              Service ({serviceCount})
            </button>
          </div>

          {/* Alert Cards List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 max-h-[380px] p-2 space-y-1.5">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Check className="mx-auto text-emerald-500 mb-2 opacity-70" size={28} />
                <p className="text-xs font-semibold text-gray-600">No active alerts in this category</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Everything is up to date.</p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isService = alert.alert_type === 'service_due'
                const isExpired = alert.severity === 'expired'
                const isWarning = alert.severity === 'warning'

                const borderLeftColor = isExpired
                  ? "border-l-red-500"
                  : isWarning
                  ? "border-l-amber-500"
                  : "border-l-blue-500"

                const badgeBg = isExpired
                  ? "bg-red-100 text-red-700 border-red-200"
                  : isWarning
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-blue-100 text-blue-700 border-blue-200"

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border border-gray-200/80 border-l-4 ${borderLeftColor} transition-all ${
                      !alert.is_read ? "bg-amber-50/40 shadow-xs" : "bg-white hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isService ? (
                          <Wrench size={14} className="text-blue-600 shrink-0" />
                        ) : isExpired ? (
                          <AlertCircle size={14} className="text-red-600 shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-gray-900 tracking-wide font-mono">
                          {alert.registration}
                        </span>
                        {alert.model && (
                          <span className="text-[11px] text-gray-500 truncate max-w-[120px]">
                            {alert.model}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${badgeBg}`}>
                          {isService ? "Service" : isExpired ? "Expired" : "≤ 7 Days"}
                        </span>
                        {!alert.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Unread" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-700 mt-1 font-medium">
                      {alert.message}
                    </p>

                    {/* Actions Row */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {onSelectCar && (
                          <button
                            onClick={() => {
                              onSelectCar(alert.registration)
                              setIsOpen(false)
                            }}
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline"
                          >
                            View Car <ArrowRight size={11} />
                          </button>
                        )}

                        {isService && onServiceDone && (
                          <button
                            onClick={() => handleMarkServiced(alert.car_id, alert.id)}
                            disabled={servicingCarId === alert.car_id}
                            className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium flex items-center gap-1 border border-blue-200 transition disabled:opacity-50"
                          >
                            <Wrench size={11} className={servicingCarId === alert.car_id ? "animate-spin" : ""} />
                            Mark Serviced
                          </button>
                        )}
                      </div>

                      {!alert.is_read && (
                        <button
                          onClick={() => markSingleRead(alert.id)}
                          disabled={markingReadId === alert.id}
                          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 transition"
                        >
                          <Check size={12} />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer with 12h cycle info + Force Sync */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
            <span>Runs every 12h • Last: {formatLastScan(lastScanAt)}</span>
            <button
              onClick={() => userId && fetchAlerts(userId, true)}
              disabled={isSyncing}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold transition disabled:opacity-50"
              title="Force check fleet issues now"
            >
              <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
              Check Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
