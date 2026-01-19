import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface LevelUpNotificationProps {
  level: number;
  onClose: () => void;
}

export default function LevelUpNotification({ level, onClose }: LevelUpNotificationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform scale-100 animate-scale-in">
        <button
          onClick={() => {
            setShow(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-4 right-4 text-white hover:text-gray-200"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">
            🎉
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Level Up!</h2>
          <p className="text-2xl font-semibold text-white mb-4">You've reached Level {level}!</p>
          <div className="flex items-center justify-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span>Keep up the great work!</span>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

