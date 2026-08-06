import { useState, useRef } from 'react';
import { User, Camera, Edit2 } from 'lucide-react';

const STORAGE_KEY = 'exam-helper-profile';

interface Profile {
  name: string;
  avatar: string | null;
}

const loadProfile = (): Profile => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  return { name: '考期助手用户', avatar: null };
};

const saveProfile = (profile: Profile): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile>(loadProfile());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const newProfile = { ...profile, avatar: event.target?.result as string };
      setProfile(newProfile);
      saveProfile(newProfile);
    };
    reader.readAsDataURL(file);
  };

  const handleNameClick = () => {
    setTempName(profile.name);
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      const newProfile = { ...profile, name: tempName.trim() };
      setProfile(newProfile);
      saveProfile(newProfile);
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        {/* 顶部提示 */}
        <div className="text-center mb-4">
          <p className="text-xs text-text-light">本地存储模式</p>
        </div>

        <h1 className="text-sm font-bold text-navy mb-4">我的</h1>
        
        {/* 用户信息卡片 */}
        <div className="card mb-4">
          <div className="flex items-center gap-3">
            {/* 头像 */}
            <div
              onClick={handleAvatarClick}
              className="relative w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-navy/20 transition-colors"
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="头像"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-navy" />
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-navy rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* 名称 */}
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                  />
                  <button
                    onClick={handleNameSave}
                    className="text-xs text-navy font-bold"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleNameCancel}
                    className="text-xs text-text-light"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleNameClick}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                >
                  <h2 className="font-bold text-base">{profile.name}</h2>
                  <Edit2 className="w-3 h-3 text-text-light" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 待开发提示 */}
        <div className="card text-center py-12">
          <p className="text-text-light text-sm">功能待开发</p>
        </div>
      </div>
    </div>
  );
};
