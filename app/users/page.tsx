// app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Eye, EyeOff, Trash2, UserPlus, Loader2 } from 'lucide-react'; // ← install lucide-react

interface User {
  id: number;
  username: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsFetching(true);
      setError(null);
      const response = await api.get('/api/users', {
        headers: { requiresAuth: true },
      });
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Could not load moderators. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null); // clear error on type
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername || !formData.password) {
      setError('Both username and password are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const body = {
         
          username: trimmedUsername,
          password: formData.password,
          role: 'moderator',
        
      }
      console.log('Creating user with data:', body);
      
      await api.post(
        '/api/register',
        body,
        { headers: { requiresAuth: true } }
      );

      setFormData({ username: '', password: '' });
      fetchUsers();
    } catch (err: any) {
      console.error('Create failed:', err);
      setError(
        err.response?.data?.detail ||
          'Failed to create moderator. Username might already exist.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Delete moderator "${username}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/api/users/${userId}`, {
        headers: { requiresAuth: true },
      });
      fetchUsers();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.detail || 'Failed to delete moderator');
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-gray-500 font-medium">Loading moderators...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 pb-16 pt-10 px-4 sm:px-6 lg:px-8">
         <style jsx>{`
        input,
        textarea,
        [contenteditable="true"] {
          text-transform: none;
        }
      `}</style>
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Moderator Management
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Add, view and remove moderator accounts
          </p>
        </div>

        {/* Create Moderator Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100/80 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              <h2 className="text-2xl font-semibold">Add New Moderator</h2>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {/* Username */}
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="peer w-full px-4 pt-8 pb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
                  placeholder=" "
                  disabled={isSubmitting}
                  required
                />
                <label
                  htmlFor="username"
                  className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm peer-focus:text-emerald-600 pointer-events-none"
                >
                  Username
                </label>
              </div>

              {/* Password with toggle */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="peer w-full px-4 pt-8 pb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition pr-11 bg-white"
                  placeholder=" "
                  disabled={isSubmitting}
                  required
                />
                <label
                  htmlFor="password"
                  className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm peer-focus:text-emerald-600 pointer-events-none"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white font-semibold
                  rounded-xl shadow-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300/50
                  transition disabled:opacity-60 disabled:cursor-not-allowed
                `}
              >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Moderator'}
              </button>
            </div>
          </form>
        </div>

        {/* Moderators List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100/80 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
            <h2 className="text-2xl font-semibold">Current Moderators</h2>
          </div>

          {users.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p className="text-xl font-medium">No moderators found</p>
              <p className="mt-2">Create your first moderator using the form above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-emerald-50/40 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-800 font-medium transition"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}