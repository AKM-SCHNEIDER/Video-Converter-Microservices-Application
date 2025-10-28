import { useState } from 'react';

const Download = () => {
  const [fid, setFid] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!fid) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/download?fid=${fid}`, {
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
        alert('Download failed');
      }
    } catch (err) {
      alert('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Download MP3</h2>
      <div className="mb-4">
        <label className="block text-gray-700">File ID</label>
        <input
          type="text"
          value={fid}
          onChange={(e) => setFid(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Enter file ID"
        />
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full bg-green-600 text-white p-2 rounded disabled:opacity-50"
      >
        {downloading ? 'Downloading...' : 'Download MP3'}
      </button>
    </div>
  );
};

export default Download;
