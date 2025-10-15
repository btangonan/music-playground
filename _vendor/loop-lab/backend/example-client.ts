/**
 * Example Frontend Client for Demucs Backend
 *
 * Shows how to integrate the backend API into a React/TypeScript frontend
 */

// Types
interface DemucsResponse {
  jobId: string;
  stems: {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
  };
  duration: number;
  processingTime: number;
}

interface DemucsError {
  error: string;
}

// Configuration
const BACKEND_URL = 'http://localhost:3001';

/**
 * Upload audio file for stem separation
 */
export async function uploadAudioFile(file: File): Promise<DemucsResponse> {
  // Validate file type
  const validTypes = ['audio/mpeg', 'audio/wav'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Only MP3 and WAV files are supported');
  }

  // Validate file size (100MB)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 100MB limit');
  }

  // Create form data
  const formData = new FormData();
  formData.append('file', file);

  // Upload
  const response = await fetch(`${BACKEND_URL}/api/demucs`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error: DemucsError = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Download stem as blob
 */
export async function downloadStem(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download stem');
  }
  return response.blob();
}

/**
 * Cleanup old stems
 */
export async function cleanupOldStems(): Promise<number> {
  const response = await fetch(`${BACKEND_URL}/api/cleanup`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Cleanup failed');
  }

  const data = await response.json();
  return data.deletedCount;
}

// React Hook Example
import { useState } from 'react';

export function useStemSeparation() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stems, setStems] = useState<DemucsResponse['stems'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const separateStems = async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress (actual progress requires WebSocket or polling)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const result = await uploadAudioFile(file);

      clearInterval(progressInterval);
      setProgress(100);
      setStems(result.stems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { separateStems, loading, progress, stems, error };
}

// React Component Example
export function StemSeparatorComponent() {
  const { separateStems, loading, progress, stems, error } = useStemSeparation();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await separateStems(file);
  };

  return (
    <div className="stem-separator">
      <input
        type="file"
        accept="audio/mpeg,audio/wav"
        onChange={handleFileUpload}
        disabled={loading}
      />

      {loading && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <p>Processing: {progress}%</p>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {stems && (
        <div className="stems">
          <h3>Stems Ready</h3>
          <ul>
            <li>
              <a href={stems.vocals} download="vocals.wav">
                Download Vocals
              </a>
            </li>
            <li>
              <a href={stems.drums} download="drums.wav">
                Download Drums
              </a>
            </li>
            <li>
              <a href={stems.bass} download="bass.wav">
                Download Bass
              </a>
            </li>
            <li>
              <a href={stems.other} download="other.wav">
                Download Other
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Axios Alternative
import axios from 'axios';

export async function uploadWithAxios(file: File): Promise<DemucsResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${BACKEND_URL}/api/demucs`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total || 1)
      );
      console.log('Upload progress:', percentCompleted);
    },
  });

  return response.data;
}
