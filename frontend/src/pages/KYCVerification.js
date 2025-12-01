import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IoAlertCircle, IoCamera as Camera, IoCheckmark as Check, IoCheckmarkCircle, IoClose as X, IoCloseCircle, IoCloudUpload, IoDocument, IoLocation, IoTime } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function KYCVerification() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [step, setStep] = useState(1);
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

  // Document states
  const [documentFront, setDocumentFront] = useState(null);
  const [documentBack, setDocumentBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [proofOfAddress, setProofOfAddress] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchKYCStatus(parsedUser.user_id);
  }, [navigate]);

  const fetchKYCStatus = async (userId) => {
    try {
      const response = await axios.get(`${API}/kyc/status/${userId}`);
      setKycStatus(response.data);
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file, setter) => {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    // Validation
    if (!documentFront || !selfie) {
      toast.error('Please upload required documents: ID front and selfie');
      return;
    }

    if (formData.id_type === 'drivers_license' && !documentBack) {
      toast.error('Please upload the back of your driver\'s license');
      return;
    }

    if (!formData.full_name || !formData.date_of_birth || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/kyc/submit`, {
        user_id: user.user_id,
        ...formData,
        document_front: documentFront,
        document_back: documentBack,
        selfie: selfie,
        proof_of_address: proofOfAddress
      });

      if (response.data.success) {
        toast.success('KYC submitted successfully! We\'ll review your documents within 24-48 hours.');
        await fetchKYCStatus(user.user_id);
        setStep(1);
      }
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          Loading...
        </div>
      </Layout>
    );
  }

  // If KYC is already verified
  if (kycStatus?.kyc_verified) {
    return (
      <Layout>
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
          <Card style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <IoCheckmarkCircle size={64} color="#10B981" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '1rem' }}>
              KYC Verified!
            </h1>
            <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
              Your account has been successfully verified.
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '2rem'
            }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
                  Verification Tier
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                  Tier {kycStatus.kyc_tier || 1}
                </div>
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
                  Status
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                  Verified
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              style={{
                marginTop: '2rem',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                padding: '1rem 2rem'
              }}
            >
              Go to Dashboard
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  // If KYC is pending
  if (kycStatus?.kyc_status === 'pending') {
    return (
      <Layout>
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
          <Card style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
            border: '2px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <IoTime size={64} color="#FBB F24" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '1rem' }}>
              KYC Under Review
            </h1>
            <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
              Your KYC documents are currently being reviewed by our team.
              We'll notify you once the verification is complete (typically within 24-48 hours).
            </p>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.5rem',
              borderRadius: '12px',
              marginTop: '2rem'
            }}>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
                Submitted On
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                {kycStatus.verification_details?.submitted_at 
                  ? new Date(kycStatus.verification_details.submitted_at).toLocaleString()
                  : 'Recently'}
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // If KYC is rejected
  if (kycStatus?.kyc_status === 'rejected') {
    return (
      <Layout>
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
          <Card style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <IoCloseCircle size={64} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '1rem' }}>
              KYC Verification Failed
            </h1>
            <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
              Unfortunately, your KYC verification was not approved.
            </p>
            {kycStatus.verification_details?.admin_notes && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
                  Reason
                </div>
                <div style={{ fontSize: '16px', color: '#fff' }}>
                  {kycStatus.verification_details.admin_notes}
                </div>
              </div>
            )}
            <Button
              onClick={() => {
                setKycStatus({ ...kycStatus, kyc_status: 'not_submitted' });
                setStep(1);
              }}
              style={{
                marginTop: '1rem',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                padding: '1rem 2rem'
              }}
            >
              Resubmit KYC
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  // KYC Submission Form
  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '800', 
          color: '#fff', 
          marginBottom: '0.5rem' 
        }}>
          KYC Verification
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          marginBottom: '2rem',
          fontSize: '16px'
        }}>
          Complete your identity verification to unlock full trading features
        </p>

        {/* Progress Steps */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '2rem',
          gap: '1rem'
        }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: step >= s 
                  ? 'linear-gradient(135deg, #00F0FF, #A855F7)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: step === s ? '2px solid #00F0FF' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
                fontSize: '18px',
                fontWeight: '700',
                color: step >= s ? '#000' : 'rgba(255, 255, 255, 0.5)'
              }}>
                {s}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: step >= s ? '#00F0FF' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: '600'
              }}>
                {s === 1 ? 'Personal Info' : s === 2 ? 'Documents' : 'Review'}
              </div>
            </div>
          ))}
        </div>

        <Card style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
                Personal Information
              </h2>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="As shown on your ID"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      Nationality *
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Your nationality"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      Country *
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      ID Type *
                    </label>
                    <select
                      value={formData.id_type}
                      onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    >
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                      ID Number *
                    </label>
                    <input
                      type="text"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      placeholder="ID number"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                style={{
                  width: '100%',
                  marginTop: '2rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  padding: '1rem'
                }}
              >
                Continue to Documents
              </Button>
            </div>
          )}

          {/* Step 2: Document Upload */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
                Upload Documents
              </h2>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* ID Front */}
                <div>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#fff', 
                    marginBottom: '0.75rem', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <IoDocument size={20} />
                    ID Document (Front) *
                  </label>
                  <div style={{
                    border: '2px dashed rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: documentFront ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('documentFront').click()}
                  >
                    <input
                      id="documentFront"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], setDocumentFront)}
                      style={{ display: 'none' }}
                    />
                    {documentFront ? (
                      <>
                        <IoCheckmarkCircle size={32} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ color: '#10B981', fontWeight: '600' }}>Document uploaded</div>
                      </>
                    ) : (
                      <>
                        <IoCloudUpload size={32} color="#00F0FF" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ color: '#00F0FF', fontWeight: '600', marginBottom: '0.25rem' }}>
                          Click to upload
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          Max 5MB (JPG, PNG)
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ID Back (if driver's license) */}
                {formData.id_type === 'drivers_license' && (
                  <div>
                    <label style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: '#fff', 
                      marginBottom: '0.75rem', 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <IoDocument size={20} />
                      ID Document (Back) *
                    </label>
                    <div style={{
                      border: '2px dashed rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '2rem',
                      textAlign: 'center',
                      background: documentBack ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('documentBack').click()}
                    >
                      <input
                        id="documentBack"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], setDocumentBack)}
                        style={{ display: 'none' }}
                      />
                      {documentBack ? (
                        <>
                          <IoCheckmarkCircle size={32} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
                          <div style={{ color: '#10B981', fontWeight: '600' }}>Document uploaded</div>
                        </>
                      ) : (
                        <>
                          <IoCloudUpload size={32} color="#00F0FF" style={{ margin: '0 auto 0.5rem' }} />
                          <div style={{ color: '#00F0FF', fontWeight: '600', marginBottom: '0.25rem' }}>
                            Click to upload
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            Max 5MB (JPG, PNG)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Selfie */}
                <div>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#fff', 
                    marginBottom: '0.75rem', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Camera size={20} />
                    Selfie with ID *
                  </label>
                  <div style={{
                    border: '2px dashed rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: selfie ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('selfie').click()}
                  >
                    <input
                      id="selfie"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], setSelfie)}
                      style={{ display: 'none' }}
                    />
                    {selfie ? (
                      <>
                        <IoCheckmarkCircle size={32} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ color: '#10B981', fontWeight: '600' }}>Selfie uploaded</div>
                      </>
                    ) : (
                      <>
                        <IoCloudUpload size={32} color="#00F0FF" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ color: '#00F0FF', fontWeight: '600', marginBottom: '0.25rem' }}>
                          Click to upload
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          Take a selfie holding your ID next to your face
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Proof of Address (Optional) */}
                <div>
                  <label style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#fff', 
                    marginBottom: '0.75rem', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <IoLocation size={20} />
                    Proof of Address (Optional)
                  </label>
                  <div style={{
                    border: '2px dashed rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: proofOfAddress ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('proofOfAddress').click()}
                  >
                    <input
                      id="proofOfAddress"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], setProofOfAddress)}
                      style={{ display: 'none' }}
                    />
                    {proofOfAddress ? (
                      <>
                        <IoCheckmarkCircle size={32} color="#10B981" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ color: '#10B981', fontWeight: '600' }}>Document uploaded</div>
                      </>
                    ) : (
                      <>
                        <IoCloudUpload size={32} color="rgba(0, 240, 255, 0.5)" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ color: 'rgba(0, 240, 255, 0.7)', fontWeight: '600', marginBottom: '0.25rem' }}>
                          Click to upload
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          Utility bill, bank statement (within 3 months)
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <Button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '1rem'
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    padding: '1rem'
                  }}
                >
                  Review & Submit
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
                Review Your Information
              </h2>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#00F0FF', marginBottom: '1rem' }}>
                    Personal Information
                  </h3>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '14px' }}>
                    <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Name:</span> <span style={{ color: '#fff' }}>{formData.full_name}</span></div>
                    <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Date of Birth:</span> <span style={{ color: '#fff' }}>{formData.date_of_birth}</span></div>
                    <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Nationality:</span> <span style={{ color: '#fff' }}>{formData.nationality}</span></div>
                    <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Address:</span> <span style={{ color: '#fff' }}>{formData.address}, {formData.city}, {formData.postal_code}, {formData.country}</span></div>
                    <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>ID Type:</span> <span style={{ color: '#fff' }}>{formData.id_type}</span></div>
                    <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>ID Number:</span> <span style={{ color: '#fff' }}>{formData.id_number}</span></div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1.5rem',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#00F0FF', marginBottom: '1rem' }}>
                    Documents Uploaded
                  </h3>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {documentFront ? <IoCheckmarkCircle size={18} color="#10B981" /> : <IoCloseCircle size={18} color="#EF4444" />}
                      <span style={{ color: '#fff' }}>ID Document (Front)</span>
                    </div>
                    {formData.id_type === 'drivers_license' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {documentBack ? <IoCheckmarkCircle size={18} color="#10B981" /> : <IoCloseCircle size={18} color="#EF4444" />}
                        <span style={{ color: '#fff' }}>ID Document (Back)</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {selfie ? <IoCheckmarkCircle size={18} color="#10B981" /> : <IoCloseCircle size={18} color="#EF4444" />}
                      <span style={{ color: '#fff' }}>Selfie with ID</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {proofOfAddress ? <IoCheckmarkCircle size={18} color="#10B981" /> : <IoAlertCircle size={18} color="#FBB F24" />}
                      <span style={{ color: '#fff' }}>Proof of Address (Optional)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.75rem'
              }}>
                <IoAlertCircle size={20} color="#FBB F24" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                  <strong>Important:</strong> Ensure all documents are clear and legible. 
                  Verification typically takes 24-48 hours. You'll be notified once complete.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button
                  onClick={() => setStep(2)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '1rem'
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: submitting 
                      ? 'rgba(0, 240, 255, 0.3)'
                      : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    padding: '1rem',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit KYC'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
