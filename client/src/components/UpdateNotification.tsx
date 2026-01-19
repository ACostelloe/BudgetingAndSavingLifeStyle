import { useEffect, useState } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      onUpdateStatus: (callback: (status: string) => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      restartApp: () => Promise<void>;
      checkUpdates: () => Promise<void>;
      isDev: boolean;
    };
  }
}

export default function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!window.electronAPI || window.electronAPI.isDev) {
      return;
    }

    // Listen for update status
    window.electronAPI.onUpdateStatus((status: string) => {
      setUpdateStatus(status);
      if (status.includes('Update available') || status.includes('Download')) {
        setShowNotification(true);
      }
    });

    // Listen for update downloaded
    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setShowNotification(true);
    });

    // Check for updates on mount
    window.electronAPI.checkUpdates();
  }, []);

  const handleRestart = async () => {
    if (window.electronAPI) {
      await window.electronAPI.restartApp();
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification || !updateStatus) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-primary-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <Download className="w-5 h-5 mr-3 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">Update Available</h4>
            <p className="text-sm text-primary-100">{updateStatus}</p>
            {updateDownloaded && (
              <button
                onClick={handleRestart}
                className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Restart to Update
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-primary-200 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

