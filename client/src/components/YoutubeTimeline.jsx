import React, { useState } from 'react';
import { YoutubeIcon, Copy } from 'lucide-react';

const YoutubeTimeline = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeline, setTimeline] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Submitting URL:', url);
      console.log('Making request to server...');
      
      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to process video');
      }

      setTimeline(data.timeline || []);
      setUrl('');
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const quotes = [
    "Generate accurate video timelines automatically",
    "Navigate your YouTube content with precision",
    "Create professional video chapters in seconds",
  ];

  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Futuristic Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-secondary-800/40 to-primary-800/40 animate-gradient"></div>
      <div className="absolute inset-0 bg-circuit-pattern opacity-20"></div>
      <div className="absolute inset-0 bg-hex-pattern opacity-10"></div>
      
      {/* Animated Geometric Shapes */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-conic from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-full animate-spin-slow"></div>
      <div className="absolute -bottom-20 -left-20 w-[40rem] h-[40rem] bg-gradient-radial from-purple-500/20 to-transparent rounded-full animate-float"></div>
      
      {/* Glowing Lines */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent top-20 animate-pulse"></div>
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent bottom-20 animate-pulse delay-700"></div>
      
      {/* Processing Animation (visible when isLoading is true) */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-processing"></div>
      )}
      
      {/* Glassmorphism Effect */}
      <div className="absolute inset-0 backdrop-blur-[1px]"></div>
      
      {/* Content container with backdrop blur */}
      <div className="relative">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/timelify_logo.png" alt="" width={64} className="ml-4" />
            <YoutubeIcon className="w-16 h-16 text-red-600" />
          </div>
        </div>
          {/* <YoutubeIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <img src="/timelify_logo.png" alt="" srcset="" width={40}/> */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Timelify - Timeline AI for YouTube
          </h1>
          <p className="text-xl text-gray-600">
            {quotes[Math.floor(Math.random() * quotes.length)]}
          </p>
        </div>

        {/* Form Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <div className="space-y-4">
                <div className="flex gap-4 relative">
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border opacity-50 cursor-not-allowed"
                    disabled
                    required
                  />
                  <div className="absolute -top-3 right-24 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full text-yellow-900">
                    Coming Soon
                  </div>
                  <button
                    type="submit"
                    disabled={true}
                    className="px-6 py-3 rounded-lg text-white font-medium bg-gray-400 cursor-not-allowed"
                  >
                    Transcribe
                  </button>
                </div>

                <div className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-lg transition-all duration-300 ${
                  isLoading 
                    ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-secondary-50 animate-shimmer'
                    : 'border-gray-300 hover:border-primary-500 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-secondary-50/50'
                }`}>
                  <input
                    type="file"
                    id="video-upload"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsLoading(true);
                        setError('');
                        const formData = new FormData();
                        formData.append('video', file);
                        
                        fetch(`${import.meta.env.VITE_APP_API_URL}/api/upload`, {
                          method: 'POST',
                          body: formData,
                        })
                        .then(response => response.json())
                        .then(data => {
                          if (data.timeline) {
                            setTimeline(data.timeline);
                          } else {
                            throw new Error(data.error || 'Failed to process video');
                          }
                        })
                        .catch(err => {
                          setError(err.message || 'An unexpected error occurred');
                        })
                        .finally(() => {
                          setIsLoading(false);
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="video-upload"
                    className={`flex-1 flex items-center justify-center gap-2 py-3 cursor-pointer transition-all duration-300 ${
                      isLoading
                        ? 'text-primary-600 animate-upload-pulse'
                        : 'text-gray-600 hover:text-primary-600'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload Video File</span>
                  </label>
                </div>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Timeline Display Section */}
        {timeline.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Video Timeline</h2>
              <button
                onClick={() => {
                  const timelineText = timeline
                    .map(item => `${item.timestamp} ${item.text}`)
                    .join('\n');
                  navigator.clipboard.writeText(timelineText);
                }}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Copy className="w-4 h-4" /> Copy Timeline
              </button>
            </div>
            <div className="space-y-3">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="text-blue-600 font-mono whitespace-nowrap">
                    {item.timestamp}
                  </span>
                  <p className="text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Automatic Timeline',
              description: 'Get precise timestamps for key moments in your video',
            },
            {
              title: 'Smart Detection',
              description: 'AI-powered detection of important video segments',
            },
            {
              title: 'One-Click Copy',
              description: 'Easily copy and use the generated timeline anywhere',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/20 hover:border-primary-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
};

export default YoutubeTimeline;
