import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import p2pService from '../../services/p2pService';
import coinGeckoService from '../../services/coinGeckoService';
import Button from '../../components/Button';

const TradeScreen = ({ route, navigation }) => {
  const { tradeId } = route.params;
  const { user } = useAuth();
  const [trade, setTrade] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const flatListRef = useRef(null);
  
  const isBuyer = trade && user.user_id === trade.buyer_id;
  const isSeller = trade && user.user_id === trade.seller_id;

  // Load trade details
  useEffect(() => {
    loadTradeDetails();
    const interval = setInterval(loadTradeDetails, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [tradeId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Load messages
  useEffect(() => {
    if (trade) {
      loadMessages();
      const interval = setInterval(loadMessages, 10000); // Refresh messages every 10 seconds
      return () => clearInterval(interval);
    }
  }, [trade]);

  const loadTradeDetails = async () => {
    try {
      const response = await p2pService.getTradeDetails(tradeId);
      setTrade(response.trade);
      setSeller(response.seller);
      setTimeLeft(response.time_remaining_seconds || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error loading trade:', error);
      Alert.alert('Error', 'Failed to load trade details');
      navigation.goBack();
    }
  };

  const loadMessages = async () => {
    try {
      const response = await p2pService.getTradeMessages(tradeId);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleMarkAsPaid = () => {
    Alert.alert(
      'Mark as Paid',
      'Have you transferred the payment to the seller? Only confirm if you have actually sent the money.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I Have Paid',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await p2pService.markPaid(tradeId, user.user_id);
              Alert.alert('Success', 'Payment marked as sent. Waiting for seller confirmation.');
              await loadTradeDetails();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to mark as paid');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReleaseCrypto = () => {
    Alert.alert(
      'Release Crypto',
      'Have you received the payment in your bank account? This will release the crypto from escrow to the buyer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Receipt & Release',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await p2pService.releaseCrypto(tradeId, user.user_id);
              Alert.alert('Success', 'Crypto released successfully!');
              await loadTradeDetails();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to release crypto');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.prompt(
      'Open Dispute',
      'Please describe the issue. The trade will be frozen and reviewed by admin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Dispute',
          onPress: async (reason) => {
            try {
              setLoading(true);
              const disputeService = require('../../services/disputeService').default;
              await disputeService.initiateDispute(
                tradeId,
                user.user_id,
                isSeller ? 'payment_not_received' : 'payment_issue',
                reason || 'Dispute opened'
              );
              Alert.alert(
                'Dispute Opened',
                'This trade is now under admin review. The escrow is frozen until resolution.',
                [{ text: 'OK', onPress: () => loadTradeDetails() }]
              );
            } catch (error) {
              console.error('Error opening dispute:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to open dispute');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleCancelTrade = () => {
    Alert.alert(
      'Cancel Trade',
      'Are you sure you want to cancel this trade? The escrow will be released back to the seller.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await p2pService.cancelTrade(tradeId, user.user_id, 'User requested cancellation');
              Alert.alert('Cancelled', 'Trade has been cancelled.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel trade');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const role = isBuyer ? 'buyer' : 'seller';
      await p2pService.sendTradeMessage(tradeId, user.user_id, role, newMessage.trim());
      setNewMessage('');
      await loadMessages();
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    if (!trade) return { text: 'Loading...', color: COLORS.textMuted, icon: 'hourglass-outline' };
    
    switch (trade.status) {
      case 'pending_payment':
        return { text: 'Waiting for Payment', color: COLORS.warning, icon: 'time-outline' };
      case 'buyer_marked_paid':
        return { text: 'Buyer Marked as Paid - Waiting for Seller', color: COLORS.info, icon: 'checkmark-circle-outline' };
      case 'released':
        return { text: 'Completed - Crypto Released', color: COLORS.success, icon: 'checkmark-done-circle' };
      case 'cancelled':
        return { text: 'Cancelled', color: COLORS.error, icon: 'close-circle-outline' };
      case 'disputed':
        return { text: 'In Dispute - Admin Review', color: COLORS.error, icon: 'alert-circle-outline' };
      default:
        return { text: trade.status, color: COLORS.textMuted, icon: 'information-circle-outline' };
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.user_id;
    
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
          <Text style={styles.messageSender}>{item.sender_role === 'buyer' ? 'Buyer' : 'Seller'}</Text>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !trade) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading trade...</Text>
      </View>
    );
  }

  if (!trade) return null;

  const statusInfo = getStatusInfo();

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollContainer}>
        {/* Escrow Banner */}
        {trade.escrow_locked && (
          <LinearGradient
            colors={[COLORS.success, '#16A34A']}
            style={styles.escrowBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="shield-checkmark" size={24} color="#FFF" />
            <Text style={styles.escrowText}>
              {trade.crypto_amount} {trade.crypto_currency} Locked in Escrow
            </Text>
          </LinearGradient>
        )}

        {/* Status & Timer Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon name={statusInfo.icon} size={28} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
            </View>
            
            {trade.status === 'pending_payment' && timeLeft > 0 && (
              <View style={styles.timerContainer}>
                <Icon name="timer-outline" size={20} color={timeLeft < 300 ? COLORS.error : COLORS.primary} />
                <Text style={[styles.timerText, timeLeft < 300 && styles.timerWarning]}>
                  {formatTime(timeLeft)} remaining
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Status Steps Indicator */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepComplete]}>
              <Icon name="checkmark" size={16} color="#FFF" />
            </View>
            <Text style={styles.stepLabel}>Order Created</Text>
          </View>
          
          <View style={styles.stepLine} />
          
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              ['buyer_marked_paid', 'released'].includes(trade.status) && styles.stepComplete,
              trade.status === 'pending_payment' && styles.stepActive
            ]}>
              {['buyer_marked_paid', 'released'].includes(trade.status) && (
                <Icon name="checkmark" size={16} color="#FFF" />
              )}
            </View>
            <Text style={styles.stepLabel}>Payment Sent</Text>
          </View>
          
          <View style={styles.stepLine} />
          
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              trade.status === 'released' && styles.stepComplete,
              trade.status === 'buyer_marked_paid' && styles.stepActive
            ]}>
              {trade.status === 'released' && (
                <Icon name="checkmark" size={16} color="#FFF" />
              )}
            </View>
            <Text style={styles.stepLabel}>Seller Confirms</Text>
          </View>
          
          <View style={styles.stepLine} />
          
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              trade.status === 'released' && styles.stepComplete
            ]}>
              {trade.status === 'released' && (
                <Icon name="checkmark" size={16} color="#FFF" />
              )}
            </View>
            <Text style={styles.stepLabel}>Completed</Text>
          </View>
        </View>

        {/* Trade Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Trade Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trade ID</Text>
            <Text style={styles.detailValue}>{trade.trade_id.substring(0, 8)}...</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValueLarge}>
              {trade.crypto_amount} {trade.crypto_currency}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Price</Text>
            <Text style={styles.detailValue}>
              {coinGeckoService.formatPrice(trade.fiat_amount, trade.fiat_currency)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <View style={styles.paymentMethodBadge}>
              <Icon name="card-outline" size={16} color={COLORS.primary} />
              <Text style={styles.paymentMethodText}>{trade.payment_method}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{isBuyer ? 'Seller' : 'Buyer'}</Text>
            <Text style={styles.detailValue}>{seller?.username || 'User'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isBuyer && trade.status === 'pending_payment' && (
            <>
              <Button
                title="I Have Paid"
                onPress={handleMarkAsPaid}
                variant="success"
                style={styles.actionButton}
              />
              <Button
                title="Cancel Trade"
                onPress={handleCancelTrade}
                variant="outline"
                style={styles.actionButton}
              />
            </>
          )}

          {isSeller && trade.status === 'buyer_marked_paid' && (
            <>
              {/* CRITICAL WARNING BANNER */}
              <View style={styles.warningBanner}>
                <View style={styles.warningHeader}>
                  <Icon name="warning-outline" size={32} color="#FFF" />
                  <Text style={styles.warningTitle}>⚠️ DO NOT RELEASE UNTIL PAYMENT CONFIRMED</Text>
                </View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningText}>• Check your bank account/payment app to confirm funds received</Text>
                  <Text style={styles.warningText}>• Verify the exact amount matches the trade</Text>
                  <Text style={styles.warningText}>• Never release crypto based on screenshots alone</Text>
                  <Text style={styles.warningText}>• Contact support if anything seems suspicious</Text>
                </View>
              </View>
              
              <Button
                title="✓ Payment Received - Release Crypto"
                onPress={handleReleaseCrypto}
                variant="success"
                style={styles.actionButton}
              />
              <Button
                title="✗ I Have Not Received Payment"
                onPress={handleReportIssue}
                variant="danger"
                style={styles.actionButton}
              />
            </>
          )}
        </View>

        {/* Trade Chat */}
        <View style={styles.chatSection}>
          <Text style={styles.chatTitle}>Trade Chat</Text>
          <Text style={styles.chatSubtitle}>
            Communicate with the {isBuyer ? 'seller' : 'buyer'}. All messages are recorded.
          </Text>
          
          <View style={styles.messagesContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.message_id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <Text style={styles.emptyMessages}>No messages yet. Start the conversation!</Text>
              }
            />
          </View>
        </View>
      </ScrollView>

      {/* Message Input (Fixed at Bottom) */}
      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sendingMessage}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.sendButtonGradient}
          >
            <Icon name="send" size={20} color="#000" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },

  // Escrow Banner
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  escrowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // Status Section
  statusSection: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  timerText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  timerWarning: {
    color: COLORS.error,
  },

  // Status Steps
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
  },
  stepComplete: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: -20,
    marginBottom: 32,
  },

  // Details Card
  detailsCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  detailValueLarge: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  paymentMethodText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Actions
  actionsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  actionButton: {
    marginBottom: 12,
  },

  // Chat
  chatSection: {
    margin: 16,
    marginTop: 8,
  },
  chatTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chatSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  messagesContainer: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 300,
  },
  messagesList: {
    padding: 12,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
  },
  theirMessageBubble: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    color: 'rgba(0, 0, 0, 0.7)',
  },
  messageText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 4,
  },
  emptyMessages: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },

  // Message Input
  messageInputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBanner: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  warningTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  warningContent: {
    gap: 6,
  },
  warningText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 20,
  },
});

export default TradeScreen;
