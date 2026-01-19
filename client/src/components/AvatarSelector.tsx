import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import api from '../api/client';

interface AvatarSelectorProps {
  currentAvatar: string;
  onSelect: (avatar: string) => void;
}

const AVATARS = [
  { emoji: '🌱', name: 'Seedling' },
  { emoji: '🐱', name: 'Cat' },
  { emoji: '🐶', name: 'Dog' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐼', name: 'Panda' },
];

export default function AvatarSelector({ currentAvatar, onSelect }: AvatarSelectorProps) {
  const [selected, setSelected] = useState(currentAvatar);

  useEffect(() => {
    setSelected(currentAvatar);
  }, [currentAvatar]);

  const handleSelect = async (avatar: string) => {
    try {
      await api.post('/gamification/avatar', { avatar });
      setSelected(avatar);
      onSelect(avatar);
    } catch (error) {
      console.error('Failed to update avatar:', error);
      alert('Failed to update avatar');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Avatar</h3>
      <div className="grid grid-cols-5 gap-4">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.emoji}
            onClick={() => handleSelect(avatar.emoji)}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 transform hover:scale-110 ${
              selected === avatar.emoji
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 hover:border-primary-300 bg-white'
            }`}
          >
            <div className="text-4xl mb-2">{avatar.emoji}</div>
            <div className="text-xs text-gray-600">{avatar.name}</div>
            {selected === avatar.emoji && (
              <div className="absolute top-2 right-2 bg-primary-500 rounded-full p-1">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

