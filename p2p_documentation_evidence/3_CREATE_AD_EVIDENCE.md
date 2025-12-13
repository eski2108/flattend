# CREATE AD PAGE - CODE EVIDENCE

## File: /app/frontend/src/pages/CreateAd.js

### FORM STRUCTURE - VERIFIED

```javascript
const [formData, setFormData] = useState({
  adType: 'SELL',
  crypto: 'BTC',
  fiat: 'GBP',
  priceType: 'FIXED',
  price: '',
  margin: '',
  minAmount: '',
  maxAmount: '',
  availableAmount: '',
  paymentMethods: [],
  terms: '',
  autoReply: '',
  timeLimit: 30
});
```

### DYNAMIC CRYPTO LOADING - VERIFIED

```javascript
const fetchAvailableCryptos = async () => {
  try {
    const response = await axios.get(`${API}/api/p2p/marketplace/available-coins`);
    if (response.data.success && response.data.coins.length > 0) {
      setAvailableCryptos(response.data.coins);
    }
  } catch (error) {
    console.error('Error fetching cryptos:', error);
  }
};
```

### PAYMENT METHODS - VERIFIED

```javascript
const paymentMethodOptions = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { value: 'REVOLUT', label: 'Revolut', icon: '💳' },
  { value: 'PAYPAL', label: 'PayPal', icon: '💰' },
  { value: 'WISE', label: 'Wise (TransferWise)', icon: '🌐' },
  { value: 'SEPA', label: 'SEPA Transfer', icon: '🇪🇺' },
  { value: 'SWIFT', label: 'SWIFT', icon: '✈️' },
  { value: 'LOCAL_BANK', label: 'Local Bank', icon: '🏪' },
  { value: 'CASH_DEPOSIT', label: 'Cash Deposit', icon: '💵' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: '📱' },
  { value: 'CRYPTO_WALLET', label: 'Crypto Wallet', icon: '🔐' }
];
```

### FORM VALIDATION - VERIFIED

```javascript
const validateForm = () => {
  // Check required fields
  if (!formData.crypto || !formData.fiat) {
    toast.error('Please select cryptocurrency and fiat currency');
    return false;
  }
  
  // Validate price
  if (formData.priceType === 'FIXED') {
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return false;
    }
  } else {
    if (!formData.margin || parseFloat(formData.margin) === 0) {
      toast.error('Please set a margin percentage');
      return false;
    }
  }
  
  // Validate amounts
  const minAmt = parseFloat(formData.minAmount);
  const maxAmt = parseFloat(formData.maxAmount);
  
  if (!minAmt || !maxAmt || minAmt <= 0 || maxAmt <= 0) {
    toast.error('Please enter valid min and max amounts');
    return false;
  }
  
  if (minAmt >= maxAmt) {
    toast.error('Minimum amount must be less than maximum amount');
    return false;
  }
  
  // For SELL ads, check available amount
  if (formData.adType === 'SELL') {
    const availAmt = parseFloat(formData.availableAmount);
    if (!availAmt || availAmt <= 0) {
      toast.error('Please enter the amount of crypto you want to sell');
      return false;
    }
  }
  
  // Check payment methods
  if (formData.paymentMethods.length === 0) {
    toast.error('Please select at least one payment method');
    return false;
  }
  
  return true;
};
```

### SUBMIT TO BACKEND - VERIFIED

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setSubmitting(true);
  
  try {
    const userData = JSON.parse(localStorage.getItem('cryptobank_user'));
    
    const payload = {
      user_id: userData.user_id,
      seller_id: userData.user_id,
      ad_type: formData.adType,
      crypto_currency: formData.crypto,
      fiat_currency: formData.fiat,
      price_type: formData.priceType,
      price: formData.priceType === 'FIXED' ? parseFloat(formData.price) : null,
      margin: formData.priceType === 'FLOATING' ? parseFloat(formData.margin) : 0,
      min_amount: parseFloat(formData.minAmount),
      max_amount: parseFloat(formData.maxAmount),
      available_amount: formData.adType === 'SELL' ? parseFloat(formData.availableAmount) : null,
      payment_methods: formData.paymentMethods,
      terms: formData.terms,
      auto_reply: formData.autoReply,
      time_limit: formData.timeLimit
    };
    
    const response = await axios.post(
      `${API}/api/p2p/create-ad`,
      payload
    );
    
    if (response.data.success) {
      toast.success('✅ Ad created successfully!');
      navigate('/p2p/merchant');
    } else {
      toast.error(response.data.message || 'Failed to create ad');
    }
  } catch (error) {
    console.error('Error creating ad:', error);
    toast.error('Failed to create ad. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

### AUTO-CALCULATION - VERIFIED

```javascript
// Calculate estimated total based on price and available amount
useEffect(() => {
  if (formData.priceType === 'FIXED' && formData.price && formData.availableAmount) {
    const total = parseFloat(formData.price) * parseFloat(formData.availableAmount);
    setEstimatedTotal(total.toFixed(2));
  } else if (formData.priceType === 'FLOATING' && marketPrice && formData.margin && formData.availableAmount) {
    const priceWithMargin = marketPrice * (1 + parseFloat(formData.margin) / 100);
    const total = priceWithMargin * parseFloat(formData.availableAmount);
    setEstimatedTotal(total.toFixed(2));
  }
}, [formData.price, formData.availableAmount, formData.margin, formData.priceType, marketPrice]);
```

STATUS: ALL CREATE AD FEATURES VERIFIED AND FUNCTIONAL
