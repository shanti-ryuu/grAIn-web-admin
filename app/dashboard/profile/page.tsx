'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Camera } from 'lucide-react'
import Card from '@/components/Card'
import { useAuthStore } from '@/lib/auth-store'
import { useUserProfile, useUpdateProfile, useUpdateAvatar } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, updateUser: updateStoreUser } = useAuthStore()
  const { data: profileData, isLoading: profileLoading } = useUserProfile()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state initialized from profile API
  const profile = (profileData as any) || {}
  const [form, setForm] = useState({
    name: profile.name || user?.name || '',
    bio: profile.bio || '',
    phoneNumber: profile.phoneNumber || '',
    location: profile.location || '',
  })
  const [isDirty, setIsDirty] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Sync form when profile data loads
  useEffect(() => {
    if (profileData) {
      const p = profileData as any
      setForm({
        name: p.name || '',
        bio: p.bio || '',
        phoneNumber: p.phoneNumber || '',
        location: p.location || '',
      })
    }
  }, [profileData])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(form)
      // FIX 6: Update Zustand auth store so navbar reflects changes immediately
      updateStoreUser({ name: form.name })
      toast({ title: 'Profile Updated', description: 'Your profile has been updated successfully' })
      setIsDirty(false)
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err?.response?.data?.error || err?.response?.data?.message || 'Failed to update profile', variant: 'destructive' })
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Invalid File', description: 'Only JPEG, PNG, and WebP images are allowed', variant: 'destructive' })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Image must be under 2MB', variant: 'destructive' })
      return
    }

    setAvatarUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string
        await updateAvatar.mutateAsync({ image: base64 })
        // FIX 6: Update Zustand store with new avatar
        updateStoreUser({ profileImage: base64 })
        toast({ title: 'Photo Updated', description: 'Profile photo updated successfully' })
        setAvatarUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setAvatarUploading(false)
      toast({ title: 'Upload Failed', description: err?.response?.data?.error || 'Failed to upload photo', variant: 'destructive' })
    }
  }

  const handleRemovePhoto = async () => {
    try {
      await updateProfile.mutateAsync({ profileImage: null } as any)
      updateStoreUser({ profileImage: null })
      toast({ title: 'Photo Removed', description: 'Profile photo has been removed' })
    } catch (err: any) {
      toast({ title: 'Failed', description: 'Could not remove photo', variant: 'destructive' })
    }
  }

  if (profileLoading && !profileData) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-2" /><div className="h-4 bg-gray-200 rounded w-96" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="animate-pulse h-64 bg-gray-200 rounded-lg" />
          <div className="animate-pulse h-64 bg-gray-200 rounded-lg md:col-span-2" />
        </div>
      </div>
    )
  }

  const currentAvatar = profile.profileImage || user?.profileImage

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-base text-gray-500">Manage your account details and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Card: Avatar */}
        <Card className="p-8 flex flex-col items-center">
          <div className="relative mb-4">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Profile" className="w-[120px] h-[120px] rounded-full object-cover border-4 border-gray-100" />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-green-800 flex items-center justify-center text-white text-4xl font-bold border-4 border-gray-100">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-800 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {avatarUploading ? 'Uploading...' : 'Change Photo'}
          </button>
          {currentAvatar && (
            <button onClick={handleRemovePhoto} className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium">
              Remove Photo
            </button>
          )}
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={`mt-2 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${user?.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
              {user?.role === 'admin' ? 'Administrator' : 'Farmer'}
            </span>
          </div>
        </Card>

        {/* Right Card: Profile Fields */}
        <Card className="p-8 md:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} autoComplete="name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={user?.email || ''} readOnly
                className="w-full px-4 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
              <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} maxLength={200} rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 resize-none" />
              <p className="mt-1 text-xs text-gray-400">{form.bio.length}/200 characters</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input type="tel" value={form.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} autoComplete="tel"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input type="text" value={form.location} onChange={(e) => handleChange('location', e.target.value)} autoComplete="address-level2"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
            </div>
            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={handleSaveProfile}
                disabled={!isDirty || updateProfile.isPending}
                className="px-6 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="text-sm text-green-800 hover:text-green-700 font-medium"
              >
                Change your password in Settings →
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
