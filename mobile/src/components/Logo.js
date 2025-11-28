import React from 'react';
import { View, Text, Image } from 'react-native';
import { COLORS } from '../config/colors';

const Logo = ({ size = 40, showText = true, style }) => {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Image
        source={require('../../assets/logo.png')}
        style={{
          width: size,
          height: size,
          resizeMode: 'contain',
        }}
      />
      
      {showText && (
        <Text
          style={{
            marginLeft: 12,
            fontSize: size * 0.45,
            fontWeight: '800',
            color: COLORS.text,
            letterSpacing: 0.5,
          }}
        >
          Coin Hub X
        </Text>
      )}
    </View>
  );
};

export default Logo;
