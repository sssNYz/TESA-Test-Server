'use client';

import { CameraInfo } from '@/lib/frontend-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CameraSelectorProps {
  cameras: CameraInfo[];
  selectedCameraId: string;
  onCameraChange: (cameraId: string) => void;
  className?: string;
}

export default function CameraSelector({ 
  cameras, 
  selectedCameraId, 
  onCameraChange, 
  className = '' 
}: CameraSelectorProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Camera Selection
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose which camera feed to monitor
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Camera:
          </label>
          <Select value={selectedCameraId} onValueChange={onCameraChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera) => (
                <SelectItem key={camera.id} value={camera.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      camera.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span>{camera.name}</span>
                    <span className="text-xs text-gray-500">({camera.id})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
