#!/bin/bash
cd /app/frontend/src/components/settings

# Fix each modal file
for file in ProfileSettings.js SecuritySettings.js TwoFactorSettings.js NotificationSettings.js LanguageSettings.js PaymentMethodsManager.js; do
  # Change modal background from dark gradient to white
  sed -i "s/background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(19, 24, 41, 0.95))'/background: '#FFFFFF'/g" "$file"
  
  # Change all white text to black
  sed -i "s/color: '#FFFFFF'/color: '#000000'/g" "$file"
  sed -i "s/color: '#FFF'/color: '#000'/g" "$file"
  sed -i "s/color: '#fff'/color: '#000'/g" "$file"
  
  # Change light gray text to darker gray
  sed -i "s/color: '#aaa'/color: '#555'/g" "$file"
  sed -i "s/color: '#888'/color: '#666'/g" "$file"
  
  # Change input backgrounds from dark to light
  sed -i "s/background: 'rgba(0, 0, 0, 0.4)'/background: '#F5F5F5'/g" "$file"
  sed -i "s/background: 'rgba(0, 0, 0, 0.3)'/background: '#F5F5F5'/g" "$file"
done

echo "Fixed all modal colors"
