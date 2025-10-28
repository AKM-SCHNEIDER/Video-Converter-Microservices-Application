import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Status = () => {
  const [fid, setFid] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkStatus = async () => {
    if (!fid) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/status?fid=${fid}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        if (data.status === 'completed') {
          navigate('/download');
        }
      } else {
        setStatus('Error checking status');
      }
    } catch (err) {
      setStatus('Error checking status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fid) {
      const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [fid]);

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Conversion Status</h2>
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
        onClick={checkStatus}
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded mb-4 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check Status'}
      </button>
      {status && (
        <div className="text-center">
          <p className="text-lg">Status: {status}</p>
          {status === 'completed' && (
            <button
              onClick={() => navigate('/download')}
              className="mt-4 bg-green-600 text-white p-2 rounded"
            >
              Download MP3
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Status;
