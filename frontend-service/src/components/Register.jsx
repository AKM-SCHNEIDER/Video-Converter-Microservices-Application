import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(email + ':' + password),
        },
      });

      if (response.ok || response.status === 201) {
        setSuccess('Registration successful! You can now log in.');
      } else if (response.status === 409) {
        setError('User already exists');
      } else if (response.status === 400) {
        setError('Missing credentials');
      } else {
        setError('Registration failed');
      }
    } catch (err) {
      setError('Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}
      {!success && (
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Register
        </button>
      </form>
      )}
      {success && (
        <button onClick={() => navigate('/')} className="w-full bg-green-600 text-white p-2 rounded">
          Go to Login
        </button>
      )}
      <p className="mt-4 text-sm text-center">
        Already have an account?{' '}
        <Link to="/" className="text-blue-600 underline">Log in</Link>
      </p>
    </div>
  );
};

export default Register;
