'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Info, Trash2, Filter } from 'lucide-react'
import Cookies from 'js-cookie'
import api from "@/lib/axios"

// Updated Types based on your requirements
interface Notification {
  notification_id: number
  created_by: string // Changed to string
  title: string
  message: string
  is_read: boolean
  is_cleared: boolean // Added is_cleared
  created_at: string
}

type FilterType = '3days' | '7days' | '30days'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('3days') // Default to 3 days
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Derived state: Filter notifications based on selected time and cleared status
  const filteredNotifications = notifications.filter((notif) => {
    const notifDate = new Date(notif.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - notifDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (filterType === '3days') {
      // Last 3 days AND NOT cleared
      return diffDays <= 3 && !notif.is_cleared
    } else if (filterType === '7days') {
      // Last 7 days (including cleared)
      return diffDays <= 7
    } else if (filterType === '30days') {
      // Last 30 days (including cleared)
      return diffDays <= 30
    }
    return true
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Unread count should primarily track non-cleared notifications
  const unreadCount = notifications.filter((n) => !n.is_read && !n.is_cleared).length

  const fetchNotifications = async (uid: number) => {
    try {
      const response = await api.get(`/api/notifications/users/${uid}`, {
        headers: { requiresAuth: true }
      })

      if (response.data?.success) {
        setNotifications(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const hasFetched = useRef(false)

  // 1. Get user ID from cookies and fetch initial notifications
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const userData = Cookies.get('user')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.id) {
          setUserId(parsed.id)
          fetchNotifications(parsed.id)
        }
      } catch (err) {
        console.error("Failed to parse user cookie", err)
      }
    }
  }, [])

  // 2. Poll for new notifications every 5 minutes
  useEffect(() => {
    if (!userId) return

    const intervalId = setInterval(() => {
      fetchNotifications(userId)
    }, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [userId])

  // 3. Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle Bell Click
  const handleBellClick = async () => {
    setIsOpen(!isOpen)

    if (!isOpen && unreadCount > 0 && userId) {
      // Optimistic UI Update: instantly visually mark all relevant ones as read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      )

      try {
        await api.patch(
          `/api/notifications/users/${userId}/read-all`,
          {},
          { headers: { requiresAuth: true } }
        )
      } catch (err) {
        console.error("Failed to mark notifications as read", err)
      }
    }
  }

  // Handle clearing all notifications
  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId) return

    // Optimistically mark notifications as cleared instead of deleting them
    // so they still show up in the 7-day and 30-day views.
    setNotifications((prev) => 
      prev.map((notif) => ({ ...notif, is_cleared: true }))
    )

    try {
      await api.patch(
        `/api/notifications/users/${userId}/clear`,
        {},
        { headers: { requiresAuth: true } }
      )
    } catch (err) {
      console.error("Failed to clear notifications", err)
      fetchNotifications(userId) // Revert on failure
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <Bell size={22} className={isOpen ? 'text-emerald-900' : 'text-emerald-700'} />

        {/* Animated Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-40"></span>
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      <div
        className={`absolute right-0 mt-3 w-80 md:w-96 rounded-2xl bg-white shadow-2xl border border-emerald-100 py-3 z-50 transform transition-all duration-300 origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-2 px-4 pb-3 border-b border-emerald-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-900 text-lg tracking-tight">Notifications</h3>
            {filteredNotifications.length > 0 && filterType === '3days' && (
              <button
                onClick={handleClearAll}
                className="text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear 
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-1">
            <Filter size={14} className="text-emerald-500" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="text-xs bg-emerald-50 border-none text-emerald-700 rounded-md py-1 px-2 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="3days">Last 3 Days</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Info size={24} className="text-emerald-400" />
              </div>
              <p className="text-emerald-800 font-medium">No notifications found</p>
              <p className="text-sm text-emerald-600/70 mt-1">
                {filterType === '3days' 
                  ? "You're all caught up for now!" 
                  : "No history found for this time period."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.notification_id}
                  className={`relative flex gap-4 p-4 transition-colors duration-200 hover:bg-emerald-50/50 ${
                    !notif.is_read ? 'bg-emerald-50/80' : 'bg-white'
                  } ${notif.is_cleared ? 'opacity-60' : ''}`}
                >
                  {/* Unread dot indicator */}
                  {!notif.is_read && !notif.is_cleared && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  )}

                  <div className="flex-1 min-w-0 ml-2">
                    <p className="text-sm font-semibold text-emerald-900 mb-0.5 flex justify-between items-start gap-2">
                      <span>{notif.title}</span>
                      {notif.is_cleared && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-sm whitespace-nowrap">
                          Cleared
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-emerald-700 leading-snug whitespace-pre-wrap break-words">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                        {formatDate(notif.created_at)}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        By {notif.created_by.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}