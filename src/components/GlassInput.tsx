import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GlassInputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: any;
}

const GlassInput: React.FC<GlassInputProps> = ({
  label,
  icon,
  error,
  containerStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <LinearGradient
        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
        style={[styles.inputContainer, isFocused && styles.focusedContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color="rgba(0,0,0,0.6)"
            style={styles.icon}
          />
        )}
        
        <TextInput
          {...textInputProps}
          style={[styles.input, textInputProps.style]}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          placeholderTextColor="rgba(0,0,0,0.5)"
        />
      </LinearGradient>
      
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  focusedContainer: {
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  error: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default GlassInput;