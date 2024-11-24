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
      
      const response = await fetch('http://localhost:8080/api/transcribe', {
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
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 animate-gradient opacity-10"></div>
      
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4">
        <div className="w-96 h-96 bg-gradient-radial from-blue-400 to-transparent opacity-20 rounded-full blur-xl"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4">
        <div className="w-96 h-96 bg-gradient-radial from-purple-400 to-transparent opacity-20 rounded-full blur-xl"></div>
      </div>
      
      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-conic from-white/80 via-white/60 to-white/80 mix-blend-overlay"></div>
      
      {/* Content container with backdrop blur */}
      <div className="relative">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <YoutubeIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            YouTube Transcriber
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

                <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="video-upload"
                    className="hidden"
                    accept="video/*"
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-blue-600 cursor-pointer"
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
              className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md hover:shadow-lg transition-all hover:bg-white/95 border border-white/20"
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
