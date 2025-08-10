import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Modal, Image, useWindowDimensions, Platform, ScrollView, Animated } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { loginWithEmail, initializeFirebase } from '../../services/FirebaseService';
import { getAuthInstance } from '../../services/FirebaseInstances';
import * as Progress from 'react-native-progress';
import { RootStackParamList } from '../../types/navigation';
import AnimatedHeader from '../../components/AnimatedHeader';
import GradientButton from '../../components/GradientButton';
import GlassInput from '../../components/GlassInput';
import GradientCard from '../../components/GradientCard';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {width} = useWindowDimensions();
  const [password, setPassword] = useState<string>("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const signIn = async (): Promise<void> => {
    if (email && password) {
      try {
        setIsLoading(true);
        const result = await loginWithEmail(email, password);
        if (!result.success) {
          alert(result.error || 'Login failed');
          setIsLoading(false);
        }
      } catch (err: any) {
        alert('Login failed. Please try again.');
        setIsLoading(false);
      }
    } else {
      alert("Enter all your details first!");
    }
  };
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <></>
    });
  }, []);
  
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        await initializeFirebase();
        
        const { default: auth } = await import('@react-native-firebase/auth');
        const unsubscribe = auth().onAuthStateChanged((authUser: any) => {
          if (authUser) {
            navigation.replace('HomeScreen', {signedUp: 0});
          } else {
            setIsLoading(false);
          }
        });
        return unsubscribe;
      } catch (error) {
        setIsLoading(false);
        console.error('Firebase initialization failed:', error);
      }
    };
    
    initAuth();
  }, []);
    
  return (
    <View style={styles.container}>
      <Modal visible={isLoading} transparent>
        <View style={styles.modal}>
          <Progress.Bar width={width*.6} indeterminate={true} color="#00d4aa" />
        </View>
      </Modal>
      
      <AnimatedHeader
        title="Welcome Back"
        subtitle="Sign in to your account"
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
            <GradientCard colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.8)']} glassmorphism style={styles.loginCard}>
              <Text style={styles.loginTitle}>Sign In</Text>
              <Text style={styles.loginSubtitle}>Enter your credentials to continue</Text>
              
              <GlassInput
                placeholder="Email Address"
                value={email}
                onChangeText={(text: string) => setEmail(text)}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                containerStyle={styles.inputContainer}
              />
              
              <GlassInput
                placeholder="Password"
                value={password}
                onChangeText={(text: string) => setPassword(text)}
                secureTextEntry
                icon="lock-closed-outline"
                containerStyle={styles.inputContainer}
                onSubmitEditing={signIn}
              />
              
              <GradientButton
                title="Sign In"
                onPress={signIn}
                icon="log-in"
                style={styles.loginButton}
                disabled={isLoading}
              />
              
              <View style={styles.divider} />
              
              <GradientButton
                title="Create Account"
                onPress={() => navigation.navigate('RegisterScreen')}
                icon="person-add"
                variant="secondary"
                style={styles.registerButton}
              />
            </GradientCard>
            
            <Text style={styles.footerText}>
              Project done under Bengal Institute of Technology
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
  loginCard: {
    padding: 24,
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  loginButton: {
    width: '100%',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 20,
  },
  registerButton: {
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