'use client';
import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function AutoCalendar() {
  const [input, setInput] = useState('');
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const parseText = async () => {
    setLoading(true);
    setStreamingText('');
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        text += chunk;
        setStreamingText(text);
        
        try {
          const parsed = JSON.parse(text);
          setEventDetails(parsed);
          setStreamingText('');
        } catch (e) {
          // Continue collecting stream until valid JSON
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const createGoogleCalendarUrl = () => {
    if (!eventDetails) return '';
    const { title, start, end, description } = eventDetails;
    const startTime = new Date(start).toISOString().replace(/[-:]/g, '').replace('.000', 'Z');
    const endTime = new Date(end).toISOString().replace(/[-:]/g, '').replace('.000', 'Z');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(description)}`;
  };

  return (
    <div className="p-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Auto Calendar
          </h1>
        </div>
        
        <div className="p-4 space-y-4">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your text here..."
            className="w-full min-h-32 p-2 border rounded-md"
          />
          
          <button 
            onClick={parseText} 
            disabled={!input || loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Analyzing...' : 'Create Event'}
          </button>

          {streamingText && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">{streamingText}</pre>
            </div>
          )}

          {eventDetails && (
            <div className="mt-4 space-y-2 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium">{eventDetails.title}</h3>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(eventDetails.start).toLocaleString()} - 
                  {new Date(eventDetails.end).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-gray-600">{eventDetails.description}</p>
              <button
                onClick={() => window.open(createGoogleCalendarUrl(), '_blank')}
                className="w-full mt-2 border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50"
              >
                Add to Google Calendar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}