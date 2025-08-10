import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Modal, Image, useWindowDimensions, Platform, ScrollView, Animated, Alert, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Progress from 'react-native-progress';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RegisterScreen'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen({ navigation }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string>('');
  const { width } = useWindowDimensions();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      // Registration logic would go here
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('LoginScreen') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderInput = (
    placeholder: string,
    field: keyof FormData,
    icon: keyof typeof Ionicons.glyphMap,
    isPassword: boolean = false,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default'
  ) => {
    const focused = focusedField === field;
    const error = errors[field];
    const showPasswordIcon = isPassword && (field === 'password' ? showPassword : showConfirmPassword);
    
    return (
      <Animated.View style={[styles.inputContainer, { opacity: fadeAnim }]}>
        <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused, error && styles.inputWrapperError]}>
          <Ionicons name={icon} size={20} color={focused ? '#10b981' : '#9ca3af'} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={formData[field]}
            onChangeText={(text) => updateFormData(field, text)}
            secureTextEntry={isPassword && !showPasswordIcon}
            keyboardType={keyboardType}
            autoCapitalize="none"
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField('')}
            onSubmitEditing={field === 'confirmPassword' ? handleRegister : undefined}
          />
          {isPassword && (
            <TouchableOpacity 
              onPress={() => field === 'password' ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)} 
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPasswordIcon ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color="#9ca3af" 
              />
            </TouchableOpacity>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Modal visible={isLoading} transparent>
        <View style={styles.modal}>
          <Progress.Bar width={width * 0.6} indeterminate={true} color="#8b5cf6" />
        </View>
      </Modal>

      <AnimatedHeader
        title="Create Account"
        subtitle="Join WhisperLang today"
        colors={['#11998e', '#38ef7d']}
      >
        <Image source={require('../../../assets/video-call-blue.png')} style={styles.headerImage} />
      </AnimatedHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <GradientCard colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.8)']} glassmorphism style={styles.registerCard}>
              <Text style={styles.registerTitle}>Sign Up</Text>
              <Text style={styles.registerSubtitle}>Create your account to get started</Text>

              <GlassInput
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                icon="person-outline"
                containerStyle={styles.inputContainer}
                error={errors.name}
              />

              <GlassInput
                placeholder="Email Address"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                containerStyle={styles.inputContainer}
                error={errors.email}
              />

              <GlassInput
                placeholder="Phone Number"
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                keyboardType="phone-pad"
                icon="call-outline"
                containerStyle={styles.inputContainer}
                error={errors.phone}
              />

              <GlassInput
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry
                icon="lock-closed-outline"
                containerStyle={styles.inputContainer}
                error={errors.password}
              />

              <GlassInput
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                secureTextEntry
                icon="lock-closed-outline"
                containerStyle={styles.inputContainer}
                error={errors.confirmPassword}
                onSubmitEditing={handleRegister}
              />

              <GradientButton
                title="Create Account"
                onPress={handleRegister}
                icon="person-add"
                variant="secondary"
                style={styles.registerButton}
                disabled={isLoading}
              />

              <View style={styles.divider} />

              <GradientButton
                title="Back to Sign In"
                onPress={() => navigation.navigate('LoginScreen')}
                icon="log-in"
                style={styles.loginButton}
              />
            </GradientCard>

            <Text style={styles.footerText}>
              By creating an account, you agree to our Terms of Service
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerImage: {
    width: 80,
    height: 80,
    marginTop: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingTop: 30,
    paddingBottom: 40,
  },
  registerCard: {
    padding: 24,
    marginBottom: 20,
  },
  registerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  registerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  registerButton: {
    width: '100%',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 20,
  },
  loginButton: {
    width: '100%',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});