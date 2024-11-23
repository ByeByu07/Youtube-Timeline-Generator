import React, { useState } from 'react';
import { YoutubeIcon, Copy } from 'lucide-react';

const YouTubeTranscriber = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState([
    { title: '', timestamp: '', content: '' }
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to process video');
      }

      // Handle successful response
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const quotes = [
    "Transform your YouTube content into text with ease",
    "Unlock the power of video transcription",
    "Make your content accessible to everyone",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <div className="flex gap-4">
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-lg text-white font-medium ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Transcribe'}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Description Generator Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Description Sections Generator</h2>
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Section Title"
                    value={section.title}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[index].title = e.target.value;
                      setSections(newSections);
                    }}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                  />
                  <input
                    type="text"
                    placeholder="Timestamp (00:00)"
                    value={section.timestamp}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[index].timestamp = e.target.value;
                      setSections(newSections);
                    }}
                    className="w-32 rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <textarea
                  placeholder="Section Content"
                  value={section.content}
                  onChange={(e) => {
                    const newSections = [...sections];
                    newSections[index].content = e.target.value;
                    setSections(newSections);
                  }}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                  rows="2"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setSections([...sections, { title: '', timestamp: '', content: '' }])}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              + Add Section
            </button>
            <button
              type="button"
              onClick={() => {
                const generatedDescription = sections
                  .map(section => `${section.timestamp} ${section.title}\n${section.content}`)
                  .join('\n\n');
                setDescription(generatedDescription);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Generate Description
            </button>
          </div>
          {description && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Generated Description</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(description)}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              </div>
              <textarea
                value={description}
                readOnly
                className="w-full rounded-lg border-gray-300 shadow-sm bg-gray-50 sm:text-sm p-2 border"
                rows="6"
              />
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Fast Processing',
              description: 'Get your transcription results quickly and efficiently',
            },
            {
              title: 'High Accuracy',
              description: 'Advanced AI ensures precise transcription results',
            },
            {
              title: 'Easy to Use',
              description: 'Simply paste your YouTube URL and click transcribe',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
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
  )
};

export default YouTubeTranscriber;
