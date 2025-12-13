import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import axios from 'axios';

const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && user.user_id) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/support/chat/${user.user_id}`);
      if (response.data.success && response.data.messages) {
        setMessages(response.data.messages);
        if (response.data.chat_id) {
          setChatId(response.data.chat_id);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user.user_id) return;

    const newMessage = {
      message: inputMessage,
      sender: 'user',
      created_at: new Date().toISOString()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/support/chat`, {
        user_id: user.user_id,
        message: inputMessage,
        chat_id: chatId
      });

      if (response.data.success) {
        setChatId(response.data.chat_id);
        // Reload messages to get any admin replies
        await loadChatHistory();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user.user_id) {
    return null; // Don't show widget if user not logged in
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 240, 255, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageCircle color="white" size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '380px',
            height: '600px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageCircle color="white" size={24} />
              <div>
                <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  Support Chat
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '12px' }}>
                  We typically reply within minutes
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X color="white" size={24} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <MessageCircle color="#00F0FF" size={48} style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                  👋 Hi! How can we help you today?
                </p>
                <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                  Send us a message and we'll get back to you quickly.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%'
                  }}
                >
                  <div
                    style={{
                      background: msg.sender === 'user'
                        ? 'linear-gradient(135deg, #00F0FF 0%, #0EA5E9 100%)'
                        : 'rgba(168, 85, 247, 0.2)',
                      color: 'white',
                      padding: '10px 14px',
                      borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      border: msg.sender === 'admin' ? '1px solid rgba(168, 85, 247, 0.5)' : 'none'
                    }}
                  >
                    {msg.message}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#666',
                      marginTop: '4px',
                      textAlign: msg.sender === 'user' ? 'right' : 'left'
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.sender === 'admin' && ' • Admin'}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderTop: '1px solid rgba(0, 240, 255, 0.2)'
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                style={{
                  padding: '12px 16px',
                  background: loading || !inputMessage.trim()
                    ? 'rgba(0, 240, 255, 0.3)'
                    : 'linear-gradient(135deg, #00F0FF 0%, #0EA5E9 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send color="white" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
