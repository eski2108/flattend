import React, { useState, useEffect, useRef } from 'react';
import { IoClose, IoChatbubbles, IoSend, IoCloudUpload, IoShield } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DisputeChatModal({ isOpen, onClose, disputeId, userId, userRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && disputeId) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, disputeId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/disputes/${disputeId}`);
      if (response.data.success) {
        setMessages(response.data.dispute.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/p2p/disputes/${disputeId}/message`, {
        sender_id: userId,
        sender_type: userRole,
        message: newMessage
      });

      if (response.data.success) {
        setNewMessage('');
        loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dispute_id', disputeId);
    formData.append('uploaded_by', userId);

    try {
      const response = await axios.post(`${API}/api/p2p/disputes/${disputeId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success('Evidence uploaded successfully');
        loadMessages();
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast.error('Failed to upload evidence');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-orange-500 rounded-2xl max-w-3xl w-full h-[600px] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IoChatbubbles className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Dispute Chat</h2>
              <p className="text-orange-100 text-sm">ID: {disputeId?.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No messages yet. Start the conversation.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_type === 'admin'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-slate-800 text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.sender_type === 'admin' && <IoShield className="w-4 h-4" />}
                    <span className="font-semibold text-sm capitalize">
                      {msg.sender_type}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 p-3 rounded-lg transition-colors">
              <IoCloudUpload className="w-5 h-5 text-cyan-400" />
              <input
                type="file"
                onChange={handleUploadEvidence}
                className="hidden"
                accept="image/*,.pdf"
              />
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !newMessage.trim()}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 p-3 rounded-lg transition-all"
            >
              <IoSend className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
