import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const UploadAPK = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.apk')) {
      setFile(selectedFile);
      setMessage('');
    } else {
      setMessage('Please select a valid APK file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select an APK file first');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/admin/upload-apk`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setMessage('✅ APK uploaded successfully! Download button will now work.');
        setFile(null);
      }
    } catch (error) {
      setMessage('❌ Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000D1A 0%, #1a1f3a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(26, 31, 58, 0.8)',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Upload Android APK
        </h1>
        
        <p style={{ color: '#888', marginBottom: '2rem', textAlign: 'center' }}>
          Upload your APK file to enable the "Download for Android" button on your website
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="file"
            accept=".apk"
            onChange={handleFileChange}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer'
            }}
          />
        </div>

        {file && (
          <div style={{
            padding: '1rem',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            color: '#00F0FF'
          }}>
            📱 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            width: '100%',
            padding: '1rem',
            background: uploading ? '#666' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '1.125rem',
            fontWeight: '700',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginBottom: '1rem'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload APK'}
        </button>

        {message && (
          <div style={{
            padding: '1rem',
            background: message.includes('✅') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.includes('✅') ? '#22C55E' : '#EF4444'}`,
            borderRadius: '8px',
            color: message.includes('✅') ? '#22C55E' : '#EF4444',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#888'
        }}>
          <strong style={{ color: '#00F0FF' }}>Instructions:</strong><br/>
          1. Get your APK from WebIntoApp.com<br/>
          2. Extract the ZIP file<br/>
          3. Find app-release.apk in the android folder<br/>
          4. Upload it here<br/>
          5. Download button will work automatically!
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="/" style={{ color: '#00F0FF', textDecoration: 'none' }}>
            ← Back to Homepage
          </a>
        </div>
      </div>
    </div>
  );
};

export default UploadAPK;
