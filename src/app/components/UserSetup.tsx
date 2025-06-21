"use client"
import { useState, useRef } from 'react';
import { FaUser, FaAt, FaSpinner } from 'react-icons/fa';
import { isUsernameAvailable, createUser, updateUser } from '../services/userService';
import { uploadAvatar, getAvatarOptions, resizeImage, deleteAvatar } from '../services/avatarService';
import { useRouter } from 'next/navigation';
import { useWallet } from '../contexts/WalletContext';

interface UserSetupProps {
  walletAddress: string;
  existingUser?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
  onComplete: (userData: { name: string; username: string; avatar?: string }) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

function UserSetup({ walletAddress, existingUser, onComplete, onCancel, isEditMode }: UserSetupProps) {
  const [name, setName] = useState(existingUser?.name || '');
  const [username, setUsername] = useState(existingUser?.username || '');
  const [avatar, setAvatar] = useState(existingUser?.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; username?: string }>({});
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [avatarUploadSuccess, setAvatarUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarOptions = getAvatarOptions();
  const router = useRouter();
  const { disconnectWallet, walletType } = useWallet();

  const validateForm = () => {
    const newErrors: { name?: string; username?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkUsername = async (usernameToCheck: string) => {
    if (usernameToCheck.length < 3) return;
    
    setIsCheckingUsername(true);
    const available = await isUsernameAvailable(usernameToCheck);
    
    if (!available) {
      setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
    } else {
      setErrors(prev => ({ ...prev, username: undefined }));
    }
    setIsCheckingUsername(false);
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    // Clear previous error
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: undefined }));
    }

    // Debounce username check
    const timeoutId = setTimeout(() => {
      if (value.trim() && value !== existingUser?.username) {
        checkUsername(value.trim());
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const resizedFile = await resizeImage(file);
      if (avatar && avatar.includes('firebase')) {
        await deleteAvatar(avatar);
      }
      const avatarUrl = await uploadAvatar(walletAddress, resizedFile);
      if (avatarUrl) {
        setAvatar(avatarUrl);
        setAvatarUploadSuccess(true);
        setTimeout(() => setAvatarUploadSuccess(false), 2000);
        setTimeout(() => setShowAvatarOptions(false), 500); // Modalı kapat
      }
    } catch (error) {
      // Hata yönetimi eklenebilir
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarSelect = async (selectedAvatar: string) => {
    if (avatar && avatar.includes('firebase')) {
      await deleteAvatar(avatar);
    }
    setAvatar(selectedAvatar);
    setShowAvatarOptions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (isCheckingUsername) return;
    if (errors.username) return;

    setIsLoading(true);

    try {
      const userData = {
        walletAddress,
        name: name.trim(),
        username: username.trim(),
        avatar: avatar || undefined
      };

      let success = false;
      if (existingUser) {
        // Update existing user
        success = await updateUser(walletAddress, userData);
      } else {
        // Create new user
        success = await createUser(userData);
      }

      if (success) {
        onComplete({ name: name.trim(), username: username.trim(), avatar });
      } else {
        setErrors({ username: 'Failed to save user data. Please try again.' });
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setErrors({ username: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      onCancel();
    } else {
      onCancel();
      disconnectWallet();
      router.push('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="relative flex items-center justify-center mx-auto mb-4 w-24 h-24">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-slate-700">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {name ? name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0,2) : <FaUser className="text-2xl" />}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarOptions(true)}
              className="absolute bottom-0 right-0 w-9 h-9 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center border-2 border-slate-800 transition-colors duration-200 shadow-lg"
              disabled={isLoading || isUploadingAvatar}
              style={{ transform: 'translate(25%, 25%)' }}
            >
              {isUploadingAvatar ? <FaSpinner className="text-white text-xs animate-spin" /> : <FaUser className="text-white text-xs" />}
            </button>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {existingUser ? 'Complete Your Profile' : 
             walletType === 'passkey' ? 'Complete Your Passkey Profile' : 'Welcome to Oblivion'}
          </h2>
          <p className="text-slate-400 text-sm">
            {existingUser 
              ? 'Please complete your profile information'
              : walletType === 'passkey'
                ? 'Create your profile to start using Oblivion with your secure passkey wallet'
                : 'Let\'s set up your profile to get started'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Passkey Info */}
          {walletType === 'passkey' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">🔐</span>
                </div>
                <div className="text-sm text-slate-200">
                  <p className="font-medium mb-1">Passkey Wallet Detected</p>
                  <p className="text-slate-300 text-xs">
                    You're using a secure passkey wallet! Your transactions will be fee-free thanks to Launchtube integration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Full Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.name ? 'border-red-500' : 'border-slate-600'
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Username
            </label>
            <div className="relative">
              <FaAt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Choose a unique username"
                className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.username ? 'border-red-500' : 'border-slate-600'
                }`}
                disabled={isLoading}
              />
              {isCheckingUsername && (
                <FaSpinner className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 text-sm animate-spin" />
              )}
            </div>
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Wallet Address Display */}
          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">
              Wallet Address
            </label>
            <div className="bg-slate-700/30 border border-slate-600 rounded-xl py-3 px-4">
              <p className="text-slate-300 text-sm font-mono break-all">
                {walletAddress}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isCheckingUsername || !!errors.username || !!errors.name}
              className={`flex-1 font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                isLoading || isCheckingUsername || !!errors.username || !!errors.name
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              {isLoading && (
                <FaSpinner className="text-sm animate-spin" />
              )}
              {isLoading ? 'Saving...' : (existingUser ? 'Update Profile' : 'Create Profile')}
            </button>
          </div>
        </form>

        {/* Avatar Seçim Modalı */}
        {showAvatarOptions && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Choose Avatar</h3>
                <button onClick={() => setShowAvatarOptions(false)} className="text-slate-400 hover:text-white transition-colors duration-200">
                  X
                </button>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 flex items-center gap-3 text-white transition-colors duration-200 justify-center"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <FaSpinner className="text-white animate-spin mr-2" />
                  ) : null}
                  <span>Upload Custom Image</span>
                </button>
                {avatarUploadSuccess && (
                  <div className="text-green-400 text-sm text-center mt-2">Avatar uploaded successfully!</div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div>
                  <p className="text-slate-400 text-sm mb-3">Or choose from presets:</p>
                  <div className="grid grid-cols-4 gap-3">
                    {avatarOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAvatarSelect(option)}
                        className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-200 ${
                          avatar === option 
                            ? 'border-blue-500 ring-2 ring-blue-500/50' 
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <img src={option} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                {avatar && (
                  <button
                    onClick={() => handleAvatarSelect('')}
                    className="w-full p-3 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-colors duration-200"
                  >
                    Remove Avatar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserSetup;