import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, Animated, TouchableOpacity, StatusBar, TextInput, Alert } from 'react-native';
import { Text, Image } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type CallsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: Props) {
  const [id, setID] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
    ]).start();
  }, []);

  const meet = (): void => {
    if (id.trim()) {
      navigation.navigate('VideoCallScreen', {id: parseInt(id), type: 1});
    } else {
      Alert.alert("Missing Meeting ID", "Please enter a valid meeting ID to join the call.");
    }
  };
  
  const createMeeting = (): void => {
    navigation.navigate('UsersScreen');
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Start Section */}
        <Animated.View 
          style={[
            styles.quickStartSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.quickStartCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.startCallGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="videocam-outline" size={32} color="#ffffff" style={styles.startCallIcon} />
              <Text style={styles.startCallTitle}>Start New Call</Text>
              <Text style={styles.startCallSubtitle}>Begin a secure video call with anyone</Text>
              
              <TouchableOpacity 
                style={styles.startCallButton}
                onPress={createMeeting}
              >
                <Text style={styles.startCallButtonText}>Start WebRTC Video Call</Text>
                <Ionicons name="arrow-forward" size={20} color="#667eea" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Join Meeting Section */}
        <Animated.View 
          style={[
            styles.joinSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.joinCard}>
            <Text style={styles.sectionTitle}>Join Meeting</Text>
            <Text style={styles.sectionSubtitle}>Enter a meeting ID to join an existing call</Text>
            
            <View style={[styles.inputWrapper, focusedField === 'meetingId' && styles.inputWrapperFocused]}>
              <Ionicons name="enter-outline" size={20} color={focusedField === 'meetingId' ? '#667eea' : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter meeting ID"
                placeholderTextColor="#9ca3af"
                value={id}
                onChangeText={setID}
                keyboardType="decimal-pad"
                onFocus={() => setFocusedField('meetingId')}
                onBlur={() => setFocusedField('')}
                onSubmitEditing={meet}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.joinButton, !id.trim() && styles.joinButtonDisabled]}
              onPress={meet}
              disabled={!id.trim()}
            >
              <LinearGradient
                colors={id.trim() ? ['#667eea', '#764ba2'] : ['#9ca3af', '#6b7280']}
                style={styles.joinGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="log-in-outline" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.joinButtonText}>Join Meeting</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  quickStartSection: {
    marginBottom: 32,
  },
  quickStartCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  startCallGradient: {
    alignItems: 'center',
    padding: 32,
  },
  startCallIcon: {
    marginBottom: 16,
  },
  startCallTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  startCallSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  startCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
  },
  startCallButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  joinSection: {
    marginBottom: 32,
  },
  joinCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 20,
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
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  joinButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
