import React, { useEffect, useState } from 'react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MessageSquare, Users, Bell } from 'lucide-react';

const PopupWindowWithWebSocket = () => {
  const [isMainWindow, setIsMainWindow] = useState(true);
  const [popupWindow, setPopupWindow] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [ws, setWs] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userId] = useState(`user-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Check if this is already a popup window
    setIsMainWindow(window.opener === null);

    // Initialize WebSocket
    const socket = new WebSocket('ws://localhost:8080');
    setWs(socket);

    socket.onopen = () => {
      setWsStatus('connected');
      // Send initial presence
      socket.send(JSON.stringify({
        type: 'join',
        userId,
        isPopup: !window.opener
      }));
    };

    socket.onclose = () => {
      setWsStatus('disconnected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && isMainWindow && !popupWindow) {
        createPopupWindow();
      }
    };

    // Handle popup close
    const handlePopupClose = () => {
      setPopupWindow(null);
      setShowAlert(false);
      // Notify others that popup was closed
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'popupClosed',
          userId
        }));
      }
    };

    // Setup event listeners
    if (isMainWindow) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', closePopupWindow);
    }

    // Synchronize state between windows using localStorage
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (isMainWindow) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', closePopupWindow);
        closePopupWindow();
      }
      window.removeEventListener('storage', handleStorageChange);
      socket.close();
    };
  }, [isMainWindow, popupWindow, userId]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'participants':
        setParticipants(data.participants);
        break;
      case 'message':
        setMessages(prev => [...prev, data]);
        // Sync messages between windows
        localStorage.setItem('meetingMessages', JSON.stringify([...messages, data]));
        break;
      case 'userJoined':
      case 'userLeft':
        // Update participants list
        setParticipants(data.participants);
        break;
      default:
        break;
    }
  };

  const handleStorageChange = (e) => {
    if (e.key === 'meetingMessages') {
      setMessages(JSON.parse(e.newValue));
    }
  };

  const createPopupWindow = () => {
    const width = window.screen.width / 4 || 800;
    const height = window.screen.height / 2 || 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      window.location.href,
      'MeetingPopup',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (popup) {
      setPopupWindow(popup);
      
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          handlePopupClose();
        }
      }, 1000);

      popup.focus();
      setShowAlert(true);

      // Notify others about popup
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'popupCreated',
          userId
        }));
      }
    }
  };

  const closePopupWindow = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    setPopupWindow(null);
    setShowAlert(false);
  };

  const sendMessage = (message) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        userId,
        message,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const renderMeetingContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>WebSocket: {wsStatus}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span>{participants.length} participants</span>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Chat Messages
        </h3>
        <div className="h-48 overflow-y-auto border rounded p-2 mb-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <span className="font-semibold">{msg.userId === userId ? 'You' : msg.userId}: </span>
              <span>{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded"
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              const input = document.querySelector('input');
              if (input.value) {
                sendMessage(input.value);
                input.value = '';
              }
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  // If this is the popup window, render the meeting content
  if (!isMainWindow) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Meeting Window</h1>
        {renderMeetingContent()}
      </div>
    );
  }

  // Main window content
  return (
    <div className="p-4">
      {showAlert ? (
        <Alert className="mb-4">
          <Bell className="w-4 h-4" />
          <AlertTitle>Meeting Popped Out</AlertTitle>
          <AlertDescription>
            Your meeting has been moved to a separate window.
            <button 
              onClick={() => popupWindow?.focus()}
              className="ml-2 text-blue-500 hover:text-blue-700 underline"
            >
              Click here to focus the meeting window
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4">Meeting Window</h2>
          {renderMeetingContent()}
          <button 
            onClick={createPopupWindow}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Pop Out Meeting
          </button>
        </div>
      )}
    </div>
  );
};

export default PopupWindowWithWebSocket;