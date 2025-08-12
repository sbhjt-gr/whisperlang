import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Platform, ScrollView, Animated, Alert, TouchableOpacity, StatusBar, TextInput, Keyboard, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerWithEmail, signInWithGoogle } from '../../services/FirebaseService';

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
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  
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

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
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
      const result = await registerWithEmail(formData.name, formData.email, formData.password);
      
      if (result.success) {
        Alert.alert('Success', 'Account created successfully! Please check your email for verification.', [
          { text: 'OK', onPress: () => navigation.replace('HomeScreen', {signedUp: 1}) }
        ]);
      } else {
        Alert.alert('Registration Failed', result.error || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      
      if (result.success) {
        navigation.replace('HomeScreen', {signedUp: 1});
      } else {
        Alert.alert('Google Sign-Up Failed', result.error || 'Google sign-up failed. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Google sign-up failed. Please try again.');
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
        <TouchableWithoutFeedback>
          <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused, error && styles.inputWrapperError]}>
            <Ionicons name={icon} size={20} color={focused ? '#667eea' : '#9ca3af'} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={formData[field]}
            onChangeText={(text) => updateFormData(field, text)}
            secureTextEntry={isPassword && !showPasswordIcon}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            passwordRules=""
            onFocus={() => {
              setFocusedField(field);
              setKeyboardVisible(true);
            }}
            onBlur={() => setFocusedField('')}
            onSubmitEditing={field === 'confirmPassword' ? handleRegister : undefined}
            blurOnSubmit={false}
            returnKeyType={field === 'confirmPassword' ? 'done' : 'next'}
            importantForAutofill="no"
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
        </TouchableWithoutFeedback>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Floating circles for visual appeal */}
      <View style={[styles.floatingCircle, styles.circle1]} />
      <View style={[styles.floatingCircle, styles.circle2]} />
      <View style={[styles.floatingCircle, styles.circle3]} />
      
      <SafeAreaView style={styles.safeArea}>

      <TouchableWithoutFeedback onPress={() => {}}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          scrollEnabled={true}
          automaticallyAdjustKeyboardInsets={false}
        >
          {/* Logo Section */}
          <Animated.View 
            style={[
              styles.logoSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/video-call-blue.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeTitle}>Join WhisperLang</Text>
            <Text style={styles.welcomeSubtitle}>Create your account to get started</Text>
          </Animated.View>

          {/* Register Form */}
          <Animated.View 
            style={[
              styles.formSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.registerCard}>
              <Text style={styles.registerTitle}>Create Account</Text>
              
              {renderInput("Full Name", "name", "person-outline")}
              {renderInput("Email Address", "email", "mail-outline", false, "email-address")}
              {renderInput("Phone Number", "phone", "call-outline", false, "phone-pad")}
              {renderInput("Password", "password", "lock-closed-outline", true)}
              {renderInput("Confirm Password", "confirmPassword", "lock-closed-outline", true)}
              
              <TouchableOpacity 
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.registerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator color="#ffffff" style={styles.buttonIcon} />
                      <Text style={styles.registerButtonText}>Creating account...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
                      <Text style={styles.registerButtonText}>Create Account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              
              <TouchableOpacity 
                style={[styles.googleButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleGoogleSignUp}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.googleButtonText}>Sign up with Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => navigation.navigate('LoginScreen')}
              >
                <Ionicons name="log-in-outline" size={20} color="#667eea" style={styles.buttonIcon} />
                <Text style={styles.loginButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: 200,
    left: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    minHeight: '100%',
  },

  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 60,
    height: 60,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  registerCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  registerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  inputWrapperFocused: {
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 8,
  },
  registerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#db4437',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#db4437',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 16,
  },
});