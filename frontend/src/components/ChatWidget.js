import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, User, Bot, Minimize2, Zap, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://coinhubuix.preview.emergentagent.com';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [chatMode, setChatMode] = useState('ai');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      message: 'Hi! 👋 I\\'m your Coin Hub X AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Hide Tawk.to widget on mount - will only show when escalating to live agent
    const hideTawkWidget = () => {
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
        try {
          window.Tawk_API.hideWidget();
        } catch (e) {
          console.log('Tawk not ready yet');
        }
      }
    };
    
    // Run immediately
    hideTawkWidget();
    
    // Keep trying for 5 seconds in case Tawk loads late
    const hideInterval = setInterval(hideTawkWidget, 500);
    setTimeout(() => clearInterval(hideInterval), 5000);
    
    return () => clearInterval(hideInterval);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: 'Thanks for your message! Our AI is processing your request. For specific account issues, please contact our support team at support@coinhubx.com or use the live chat during business hours.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
      
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createChatSession = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.user_id;
      const userEmail = localStorage.getItem('user_email');
      
      const response = await axios.post(`${BACKEND_URL}/api/chat/session/create`, {
        user_id: userId,
        user_email: userEmail
      });

      if (response.data.success) {
        setSessionId(response.data.session_id);
        return response.data.session_id;
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
    return null;
  };

  const handleOpenChat = async () => {
    setIsOpen(true);
    if (!sessionId) {
      const newSessionId = await createChatSession();
      if (newSessionId) {
        // Add welcome message - AI responds first automatically
        setMessages([{
          sender: 'ai',
          message: "Hi! I'm the CoinHub X assistant. How can I help you today?",
          timestamp: new Date().toISOString()
        }]);
        // Go straight to AI mode (no button choice)
        setChatMode('ai');
        setShowOptions(false);
      }
    }
  };

  const handleChooseLiveAgent = async () => {
    // First check if Tawk.to is loaded
    if (!window.Tawk_API) {
      setMessages(prev => [...prev, {
        sender: 'system',
        message: "Live chat is loading... Please wait a moment and try again.",
        timestamp: new Date().toISOString()
      }]);
      return;
    }
    
    setChatMode('live_agent');
    
    // Escalate to live agent in backend (sends admin notification)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/chat/escalate`, {
        session_id: sessionId
      });

      if (response.data.success) {
        setMessages(prev => [...prev, {
          sender: 'system',
          message: "Connecting you to our support team...",
          timestamp: new Date().toISOString()
        }]);

        // Wait a moment then switch to Tawk.to
        setTimeout(() => {
          try {
            // Send chat history to Tawk.to as initial message
            const chatHistoryText = messages.map(msg => 
              `${msg.sender === 'user' ? 'User' : msg.sender === 'ai' ? 'AI Assistant' : 'System'}: ${msg.message}`
            ).join('\n\n');
            
            // Try to send chat history to Tawk
            if (window.Tawk_API && typeof window.Tawk_API.addEvent === 'function') {
              window.Tawk_API.addEvent('previous-chat-history', {
                history: chatHistoryText
              });
            }
            
            // Show and maximize Tawk.to widget
            if (window.Tawk_API) {
              window.Tawk_API.showWidget();
              
              // Try to maximize if function exists
              if (typeof window.Tawk_API.maximize === 'function') {
                window.Tawk_API.maximize();
              }
            }
            
            // Hide our custom chat widget
            setIsOpen(false);
            
          } catch (tawkError) {
            console.error('Tawk.to error:', tawkError);
            setMessages(prev => [...prev, {
              sender: 'system',
              message: "Please check the Tawk.to chat widget that just opened.",
              timestamp: new Date().toISOString()
            }]);
            setIsOpen(false);
          }
        }, 1000);
      } else {
        throw new Error(response.data.error || 'Escalation failed');
      }
    } catch (error) {
      console.error('Failed to escalate:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        message: "Our live chat system is currently unavailable. Please try again in a moment or email support@coinhubx.com",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) {
      console.log('Empty message, ignoring');
      return;
    }
    
    // Make sure we have a session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      console.log('No session ID, creating new session...');
      currentSessionId = await createChatSession();
      if (!currentSessionId) {
        console.error('Failed to create session');
        setMessages(prev => [...prev, {
          sender: 'system',
          message: "Failed to start chat session. Please refresh the page.",
          timestamp: new Date().toISOString()
        }]);
        return;
      }
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    console.log('Sending message:', userMessage, 'Session:', currentSessionId);
    
    // Add user message to UI
    setMessages(prev => {
      const newMessages = [...prev, {
        sender: 'user',
        message: userMessage,
        timestamp: new Date().toISOString()
      }];
      console.log('Messages after adding user msg:', newMessages.length);
      return newMessages;
    });

    setIsLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/chat/message`, {
        session_id: currentSessionId,
        message: userMessage,
        user_id: localStorage.getItem('user_id')
      });

      console.log('AI Response received:', response.data);

      if (response.data.success) {
        if (response.data.is_live_agent) {
          // Already escalated to live agent
          setMessages(prev => [...prev, {
            sender: 'system',
            message: "Your message has been sent to our live agent team. They will respond shortly.",
            timestamp: new Date().toISOString()
          }]);
        } else {
          // AI response
          const aiMessage = {
            sender: 'ai',
            message: response.data.response,
            timestamp: new Date().toISOString()
          };
          
          // Add "Talk to Live Agent" button if AI suggests escalation
          if (response.data.should_escalate) {
            aiMessage.showEscalateButton = true;
          }
          
          console.log('Adding AI message:', aiMessage);
          setMessages(prev => {
            const newMessages = [...prev, aiMessage];
            console.log('Total messages after AI response:', newMessages.length);
            return newMessages;
          });
        }
      } else {
        console.error('API returned error:', response.data);
        setMessages(prev => [...prev, {
          sender: 'system',
          message: "I'm having trouble connecting. Please try again.",
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        message: "Sorry, something went wrong. Please try again or contact a live agent.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenChat}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={28} color="#000" />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#EF4444',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: '#fff'
          }}>
            {unreadCount}
          </div>
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: window.innerWidth <= 768 ? '100vw' : '400px',
      height: window.innerWidth <= 768 ? '100vh' : '600px',
      background: 'linear-gradient(135deg, #0F172A, #1E293B)',
      border: '2px solid rgba(0, 240, 255, 0.3)',
      borderRadius: window.innerWidth <= 768 ? '0' : '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      ...(window.innerWidth <= 768 && {
        bottom: 0,
        right: 0,
        borderRadius: 0
      })
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))',
        borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopLeftRadius: window.innerWidth <= 768 ? '0' : '14px',
        borderTopRightRadius: window.innerWidth <= 768 ? '0' : '14px'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
            {chatMode === 'live_agent' ? 'Live Support' : 'Coin Hub X Support'}
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '11px', color: '#888' }}>
            {chatMode === 'ai' && 'We\'re here to help 24/7'}
            {chatMode === 'live_agent' && 'Connected to support team'}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            padding: '0.5rem'
          }}
        >
          {window.innerWidth <= 768 ? <X size={24} /> : <Minimize2 size={20} />}
        </button>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: msg.sender === 'user' ? 'linear-gradient(135deg, #A855F7, #00F0FF)' : 
                          msg.sender === 'ai' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(168, 85, 247, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {msg.sender === 'user' ? <User size={18} color="#fff" /> :
               msg.sender === 'ai' ? <Bot size={18} color="#00F0FF" /> :
               <MessageCircle size={18} color="#A855F7" />}
            </div>

            {/* Message */}
            <div style={{
              maxWidth: '75%',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: msg.sender === 'user' ? 'linear-gradient(135deg, #A855F7, #00F0FF)' :
                          'rgba(0, 0, 0, 0.3)',
              color: msg.sender === 'user' ? '#000' : '#E2E8F0',
              fontSize: '14px',
              lineHeight: '1.5',
              wordWrap: 'break-word'
            }}>
              {msg.message}
              {msg.showEscalateButton && (
                <button
                  onClick={handleChooseLiveAgent}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#000',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Talk to Live Agent
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(0, 240, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={18} color="#00F0FF" />
            </div>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#888',
              fontSize: '14px'
            }}>
              Typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - AI mode always active */}
      {chatMode === 'ai' && (
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            style={{
              padding: '0.75rem',
              background: isLoading || !inputMessage.trim() ? '#444' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={20} color={isLoading || !inputMessage.trim() ? '#888' : '#000'} />
          </button>
        </div>
      )}
    </div>
  );
}
