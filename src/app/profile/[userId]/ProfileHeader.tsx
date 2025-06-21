import React from 'react';

interface ProfileHeaderProps {
  user: {
    name?: string;
    username?: string;
    avatar?: string;
    bio?: string;
  };
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  return (
    <div className="flex items-center gap-6 p-6 mb-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 shadow-xl">
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-2xl font-bold">
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U'}
            </span>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{user.name || 'User'}</h2>
        <p className="text-slate-400 text-lg">@{user.username || 'username'}</p>
        {user.bio && (
          <p className="text-slate-500 text-sm mt-2 max-w-md">{user.bio}</p>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
