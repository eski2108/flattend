import React, { useState, useEffect, useRef } from 'react';
import { IoChatbubbles, IoClose, IoContract as Minimize, IoContract as Minimize2, IoSend } from 'react-icons/io5';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChat = async (userId) => {
    try {
      const response = await axios.get(`${API}/support/chat/${userId}`);
      if (response.data.success && response.data.messages) {
        setMessages(response.data.messages);
        setChatId(response.data.chat_id);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  useEffect(() => {
    // Get user data
    const user = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
    setUserData(user);

    // Load existing chat if any
    if (user.user_id) {
      loadChat(user.user_id);
    }

    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        sender: 'support',
        message: 'Hi! How can we help you today? 👋',
        timestamp: new Date()
      }]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: inputMessage,
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // Send to backend
    try {
      if (userData.user_id) {
        await axios.post(`${API}/support/chat`, {
          user_id: userData.user_id,
          message: inputMessage,
          chat_id: chatId
        });
      }

      // Auto-reply for demo
      setTimeout(() => {
        const autoReply = {
          id: Date.now().toString(),
          sender: 'support',
          message: 'Thanks for contacting Coin Hub IoClose as X support. Our team will respond shortly. For urgent issues, please email support@coinhubx.com',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, autoReply]);
      }, 1500);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(168, 85, 247, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s ease',
          animation: 'pulse 2s infinite'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 240, 255, 0.8), 0 0 60px rgba(168, 85, 247, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(168, 85, 247, 0.4)';
        }}
      >
        <IoChatbubbles size={28} color="#000" />
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 4px 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(168, 85, 247, 0.4); }
            50% { box-shadow: 0 4px 20px rgba(0, 240, 255, 0.8), 0 0 60px rgba(168, 85, 247, 0.6); }
          }
        `}</style>
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '380px',
      maxWidth: 'calc(100vw - 48px)',
      height: isMinimized ? '60px' : '550px',
      maxHeight: 'calc(100vh - 100px)',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      borderRadius: '16px',
      border: '2px solid #00F0FF',
      boxShadow: '0 8px 40px rgba(0, 240, 255, 0.3), 0 0 80px rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'height 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IoChatbubbles size={24} color="#000" />
          <div>
            <div style={{ color: '#000', fontSize: '16px', fontWeight: '700' }}>Coin Hub IoClose as X Support</div>
            <div style={{ color: 'rgba(0, 0, 0, 0.7)', fontSize: '12px' }}>We're here to help 24/7</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Minimize2 size={18} color="#000" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IoClose size={18} color="#000" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: msg.sender === 'user' 
                    ? 'linear-gradient(135deg, #00F0FF, #00D5FF)' 
                    : 'rgba(168, 85, 247, 0.2)',
                  color: msg.sender === 'user' ? '#000' : '#fff',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: inputMessage.trim() 
                  ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
                  : 'rgba(100, 100, 100, 0.3)',
                cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IoSend size={18} color={inputMessage.trim() ? '#000' : '#666'} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
