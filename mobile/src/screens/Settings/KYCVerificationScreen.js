import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { COLORS } from '../../config/colors';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const KYCVerificationScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [step, setStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    id_type: 'passport',
    id_number: '',
  });

  // Documents
  const [documentFront, setDocumentFront] = useState(null);
  const [documentBack, setDocumentBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [proofOfAddress, setProofOfAddress] = useState(null);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/kyc/status/${user.user_id}`);
      setKycStatus(response.data);
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (setter) => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      includeBase64: true,
    });

    if (!result.didCancel && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setter(`data:${asset.type};base64,${asset.base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!documentFront || !selfie) {
      Alert.alert('Error', 'Please upload required documents: ID front and selfie');
      return;
    }

    if (formData.id_type === 'drivers_license' && !documentBack) {
      Alert.alert('Error', 'Please upload the back of your driver\'s license');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/kyc/submit`, {
        user_id: user.user_id,
        ...formData,
        document_front: documentFront,
        document_back: documentBack,
        selfie: selfie,
        proof_of_address: proofOfAddress
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'KYC submitted successfully! We\'ll review your documents within 24-48 hours.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // If KYC is verified
  if (kycStatus?.kyc_verified) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <Icon name="checkmark-circle" size={80} color="#10B981" />
            <Text style={styles.statusTitle}>KYC Verified!</Text>
            <Text style={styles.statusSubtitle}>
              Your account has been successfully verified.
            </Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>Tier {kycStatus.kyc_tier || 1}</Text>
            </View>
            <Button
              title="Back to Settings"
              onPress={() => navigation.goBack()}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // If KYC is pending
  if (kycStatus?.kyc_status === 'pending') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <Icon name="time-outline" size={80} color="#FBB F24" />
            <Text style={styles.statusTitle}>KYC Under Review</Text>
            <Text style={styles.statusSubtitle}>
              Your documents are being reviewed. You'll be notified once complete (typically 24-48 hours).
            </Text>
            <Button
              title="Back to Settings"
              onPress={() => navigation.goBack()}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // If KYC is rejected
  if (kycStatus?.kyc_status === 'rejected') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <Icon name="close-circle" size={80} color="#EF4444" />
            <Text style={styles.statusTitle}>KYC Verification Failed</Text>
            <Text style={styles.statusSubtitle}>
              Unfortunately, your KYC verification was not approved.
            </Text>
            {kycStatus.verification_details?.admin_notes && (
              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Reason:</Text>
                <Text style={styles.notesText}>{kycStatus.verification_details.admin_notes}</Text>
              </View>
            )}
            <Button
              title="Resubmit KYC"
              onPress={() => {
                setKycStatus({ ...kycStatus, kyc_status: 'not_submitted' });
                setStep(1);
              }}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // KYC Submission Form
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>KYC Verification</Text>
        <Text style={styles.subtitle}>Complete identity verification to unlock full trading features</Text>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                step >= s && styles.stepCircleActive
              ]}>
                <Text style={[
                  styles.stepNumber,
                  step >= s && styles.stepNumberActive
                ]}>
                  {s}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                step >= s && styles.stepLabelActive
              ]}>
                {s === 1 ? 'Personal' : s === 2 ? 'Documents' : 'Review'}
              </Text>
            </View>
          ))}
        </View>

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Date of Birth (YYYY-MM-DD) *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.date_of_birth}
              onChangeText={(text) => setFormData({ ...formData, date_of_birth: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nationality *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.nationality}
              onChangeText={(text) => setFormData({ ...formData, nationality: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Address *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="City *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Postal Code *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.postal_code}
              onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Country *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="ID Number *"
              placeholderTextColor={COLORS.textMuted}
              value={formData.id_number}
              onChangeText={(text) => setFormData({ ...formData, id_number: text })}
            />

            <Button
              title="Continue to Documents"
              onPress={() => setStep(2)}
              style={styles.button}
            />
          </View>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Upload Documents</Text>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setDocumentFront)}
            >
              <Icon
                name={documentFront ? "checkmark-circle" : "cloud-upload-outline"}
                size={32}
                color={documentFront ? "#10B981" : COLORS.primary}
              />
              <Text style={styles.uploadText}>
                {documentFront ? "ID Front Uploaded ✓" : "Upload ID Front *"}
              </Text>
            </TouchableOpacity>

            {formData.id_type === 'drivers_license' && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage(setDocumentBack)}
              >
                <Icon
                  name={documentBack ? "checkmark-circle" : "cloud-upload-outline"}
                  size={32}
                  color={documentBack ? "#10B981" : COLORS.primary}
                />
                <Text style={styles.uploadText}>
                  {documentBack ? "ID Back Uploaded ✓" : "Upload ID Back *"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setSelfie)}
            >
              <Icon
                name={selfie ? "checkmark-circle" : "camera-outline"}
                size={32}
                color={selfie ? "#10B981" : COLORS.primary}
              />
              <Text style={styles.uploadText}>
                {selfie ? "Selfie Uploaded ✓" : "Upload Selfie with ID *"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setProofOfAddress)}
            >
              <Icon
                name={proofOfAddress ? "checkmark-circle" : "document-outline"}
                size={32}
                color={proofOfAddress ? "#10B981" : "rgba(0, 240, 255, 0.5)"}
              />
              <Text style={[styles.uploadText, !proofOfAddress && { opacity: 0.7 }]}>
                {proofOfAddress ? "Proof of Address Uploaded ✓" : "Upload Proof of Address (Optional)"}
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <Button
                title="Back"
                onPress={() => setStep(1)}
                style={[styles.button, styles.buttonHalf, styles.buttonOutline]}
              />
              <Button
                title="Review"
                onPress={() => setStep(3)}
                style={[styles.button, styles.buttonHalf]}
              />
            </View>
          </View>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Review Your Information</Text>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Name:</Text>
              <Text style={styles.reviewValue}>{formData.full_name}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Date of Birth:</Text>
              <Text style={styles.reviewValue}>{formData.date_of_birth}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Address:</Text>
              <Text style={styles.reviewValue}>
                {formData.address}, {formData.city}, {formData.postal_code}, {formData.country}
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Documents:</Text>
              <Text style={styles.reviewValue}>
                {documentFront ? '✓' : '✗'} ID Front{'\n'}
                {formData.id_type === 'drivers_license' && (documentBack ? '✓' : '✗') + ' ID Back\n'}
                {selfie ? '✓' : '✗'} Selfie{'\n'}
                {proofOfAddress ? '✓' : '✗'} Proof of Address
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <Button
                title="Back"
                onPress={() => setStep(2)}
                style={[styles.button, styles.buttonHalf, styles.buttonOutline]}
              />
              <Button
                title={submitting ? "Submitting..." : "Submit KYC"}
                onPress={handleSubmit}
                disabled={submitting}
                style={[styles.button, styles.buttonHalf]}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  stepNumberActive: {
    color: '#000',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepLabelActive: {
    color: COLORS.primary,
  },
  formCard: {
    backgroundColor: 'rgba(26, 31, 58, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    marginTop: 16,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  statusCard: {
    backgroundColor: 'rgba(26, 31, 58, 0.8)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  tierBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  tierText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  notesCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 16,
    color: COLORS.text,
  },
  reviewSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.1)',
  },
  reviewLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: COLORS.text,
  },
});

export default KYCVerificationScreen;
