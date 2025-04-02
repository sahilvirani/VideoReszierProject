import React, { useState } from 'react';

function App() {
  const [video1, setVideo1] = useState('');
  const [video2, setVideo2] = useState('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  //Logic for when the user clicks on thhe process video button. 
  const handleProcessVideo = async () => {
    setLoading(true);
    setErrorMsg('');
    setProcessedVideoUrl(null);

    try {
      const response = await fetch('http://localhost:5040/process-video', { //fetches backend API
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video1, video2 }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error processing video');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setProcessedVideoUrl(data.processed_video_url);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  //Logic for when the user clicks on thhe download button. 
  const handleDownload = () => {
    if (!processedVideoUrl) return;
    const link = document.createElement('a');
    link.href = processedVideoUrl;
    link.download = 'processed-video.mp4';
    link.click();
  };

  return (
    <div
      className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center"
      style={{ fontFamily: 'Montserrat, sans-serif' }}
    >
      <div className="max-w-xl w-full p-6">
        <h1 className="text-4xl font-bold mb-2 text-center">Video Processing App</h1>
        <p className="text-center text-gray-400 mb-6">Enter two video URLs to concatenate &amp; scale.</p>
        
        <label className="block mb-1 text-sm font-semibold text-gray-300">Video 1 URL</label>
        <input
          type="text"
          value={video1}
          onChange={(e) => setVideo1(e.target.value)}
          className="w-full p-2 mb-4 rounded text-gray-900 outline-none"
          placeholder=" Please enter URL 1"
        />

        <label className="block mb-1 text-sm font-semibold text-gray-300">Video 2 URL</label>
        <input
          type="text"
          value={video2}
          onChange={(e) => setVideo2(e.target.value)}
          className="w-full p-2 mb-4 rounded text-gray-900 outline-none"
          placeholder="Please Enter URL 2"
        />

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={handleProcessVideo}
            disabled={loading || !video1 || !video2}
            className={`${
              loading || !video1 || !video2
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700'
            } text-white px-5 py-2 font-semibold rounded transition`}
          >
            {loading ? 'Processing...' : 'Process Videos'}
          </button>

          {processedVideoUrl && (
            <button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 font-semibold rounded transition"
            >
              Download Video
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 text-red-400 font-semibold text-center">
            Error: {errorMsg}
          </div>
        )}

        {/* Preview of Processed video */}
        {processedVideoUrl && (
          <div className="mt-10 text-center">
            <h3 className="text-xl font-bold mb-3">Processed Video Preview</h3>
            <video
                src={processedVideoUrl}
                controls
                className="w-1/2 h-auto border border-gray-600 rounded mx-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
