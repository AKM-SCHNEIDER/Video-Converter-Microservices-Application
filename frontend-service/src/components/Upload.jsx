import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fid, setFid] = useState('');
  const [status, setStatus] = useState('');
  const [mp3Fid, setMp3Fid] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    setMessage('');
    setStatus('');
    setMp3Fid('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.video_fid) {
          setFid(data.video_fid);
          localStorage.setItem('video_fid', data.video_fid);
          setMessage('Upload successful. Converting your video to MP3...');
          // start background polling automatically
          startPolling(data.video_fid);
        } else {
          setMessage('Upload successful.');
        }
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const startPolling = (videoFid) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?fid=${videoFid}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          if (data.status === 'completed') {
            clearInterval(pollRef.current);
            if (data.mp3_fid) {
              setMp3Fid(data.mp3_fid);
              localStorage.setItem('mp3_fid', data.mp3_fid);
            }
            setMessage('Status: completed\nReady! Click "Download MP3" to download your file.');
          }
        }
      } catch (e) {
        // ignore transient errors during polling
      }
    }, 3000);
  };

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  const handleDownload = async () => {
    if (!mp3Fid) return;
    try {
      const response = await fetch(`/api/download?fid=${mp3Fid}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted.mp3';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Download failed. Please try again.');
      }
    } catch (err) {
      setError('Download failed. Please check your connection and try again.');
    }
  };

  const resetForm = () => {
    clearInterval(pollRef.current);
    setFile(null);
    setUploading(false);
    setFid('');
    setStatus('');
    setMp3Fid('');
    setMessage('');
    setError('');
    localStorage.removeItem('video_fid');
    localStorage.removeItem('mp3_fid');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Convert Video to MP3</h2>
      {status !== 'completed' && (
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
          Select an MP4 video and click <span className="font-semibold">Convert</span>. We'll process it and let you download the MP3 when ready.
        </div>
      )}
      {error && <p className="text-red-600 mb-3">{error}</p>}
      {message && status !== 'completed' && (
        <div className="mb-3 whitespace-pre-line text-green-700">{message}</div>
      )}
      {status !== 'completed' && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Select MP4 file</label>
            <input
              type="file"
              accept=".mp4"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full p-2 border border-gray-300 rounded"
              required
              ref={fileInputRef}
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Convert'}
          </button>
        </form>
      )}
      {fid && status !== 'completed' && (
        <div className="mt-4 text-sm text-gray-700">
          <p><span className="font-semibold">File ID:</span> {fid}</p>
          <p className="mt-1 text-yellow-700">Converting... this may take a moment.</p>
        </div>
      )}
      {status === 'completed' && (
        <div className="mt-4">
          <div className="inline-block px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">Status: completed</div>
          <p className="mt-2 text-gray-800">Ready! Click "Download MP3" to download your file.</p>
          <button
            onClick={handleDownload}
            className="mt-3 bg-green-600 text-white p-2 rounded"
          >
            Download MP3
          </button>
          <button
            onClick={resetForm}
            className="mt-3 ml-3 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
          >
            Convert Another Video
          </button>
        </div>
      )}
    </div>
  );
};

export default Upload;
