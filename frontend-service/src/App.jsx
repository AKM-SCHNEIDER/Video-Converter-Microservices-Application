import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Upload from './components/Upload';
import Register from './components/Register';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 shadow">
          <h1 className="text-2xl font-bold tracking-tight">Video to MP3 Converter</h1>
          <p className="text-sm text-blue-100 mt-1">Register → Login → Convert → Download</p>
        </header>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
