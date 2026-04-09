'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info } from 'lucide-react'
import Cookies from 'js-cookie'
import api from "@/lib/axios"

// Types based on your API documentation
interface Notification {
  notification_id: number
  created_by: number
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // 1. Get user ID from cookies and fetch notifications
  useEffect(() => {
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

  // 2. Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch all notifications for the user using your axios instance
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

  // Handle Bell Click: Toggle Dropdown & Mark all as read optimistically in the background
  const handleBellClick = async () => {
    setIsOpen(!isOpen)

    if (!isOpen && unreadCount > 0 && userId) {
      // Optimistic UI Update: instantly visually mark all as read for buttery smooth UX
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      )

      // Background API call to actually mark them as read in the DB using axios
      try {
        await api.patch(
          `/api/notifications/users/${userId}/read-all`,
          {}, // Empty body
          { headers: { requiresAuth: true } }
        )
      } catch (err) {
        console.error("Failed to mark notifications as read", err)
      }
    }
  }

  // Format date nicely (e.g., "Apr 9, 10:30 AM")
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
        <div className="flex items-center justify-between px-4 pb-3 border-b border-emerald-50">
          <h3 className="font-bold text-emerald-900 text-lg tracking-tight">Notifications</h3>
          {unreadCount === 0 && notifications.length > 0 && (
            <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={12} /> All caught up
            </span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Info size={24} className="text-emerald-400" />
              </div>
              <p className="text-emerald-800 font-medium">No notifications yet</p>
              <p className="text-sm text-emerald-600/70 mt-1">We'll let you know when something comes up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif.notification_id}
                  className={`relative flex gap-4 p-4 transition-colors duration-200 hover:bg-emerald-50/50 ${
                    !notif.is_read ? 'bg-emerald-50/80' : 'bg-white'
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!notif.is_read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  )}
                  
                  <div className="flex-1 min-w-0 ml-2">
                    <p className="text-sm font-semibold text-emerald-900 mb-0.5">
                      {notif.title}
                    </p>
                    <p className="text-sm text-emerald-700 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[11px] font-medium text-emerald-500 mt-2 flex items-center gap-1">
                      {formatDate(notif.created_at)}
                    </p>
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