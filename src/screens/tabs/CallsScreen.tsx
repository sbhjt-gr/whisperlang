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
        {/* Hero Section */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <Ionicons name="videocam" size={28} color="#667eea" />
            </View>
            <Text style={styles.heroTitle}>Video Calling</Text>
            <Text style={styles.heroSubtitle}>Connect with anyone, anywhere in the world with live translation</Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={createMeeting}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add-outline" size={24} color="#ffffff" />
                <Text style={styles.actionTitle}>New Meeting</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {/* Schedule meeting */}}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="calendar-outline" size={24} color="#ffffff" />
                <Text style={styles.actionTitle}>Schedule</Text>
              </LinearGradient>
            </TouchableOpacity>
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
            <View style={styles.joinHeader}>
              <Ionicons name="enter-outline" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>Join a Meeting</Text>
            </View>
            
            <View style={[styles.inputWrapper, focusedField === 'meetingId' && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter meeting ID or link"
                placeholderTextColor="#9ca3af"
                value={id}
                onChangeText={setID}
                keyboardType="default"
                onFocus={() => setFocusedField('meetingId')}
                onBlur={() => setFocusedField('')}
                onSubmitEditing={meet}
              />
              {id.trim() && (
                <TouchableOpacity onPress={() => setID('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.joinButton, !id.trim() && styles.joinButtonDisabled]}
              onPress={meet}
              disabled={!id.trim()}
            >
              <Text style={[styles.joinButtonText, !id.trim() && styles.joinButtonTextDisabled]}>
                Join Meeting
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={16} 
                color={id.trim() ? '#667eea' : '#9ca3af'} 
                style={styles.joinButtonIcon}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View 
          style={[
            styles.recentSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.recentCard}>
            <View style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="videocam-outline" size={16} color="#667eea" />
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTitle}>Meeting with John Doe</Text>
                <Text style={styles.recentTime}>2 hours ago • 15 minutes</Text>
              </View>
              <TouchableOpacity style={styles.recentAction}>
                <Ionicons name="refresh-outline" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="people-outline" size={16} color="#10b981" />
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTitle}>Team Standup</Text>
                <Text style={styles.recentTime}>Yesterday • 30 minutes</Text>
              </View>
              <TouchableOpacity style={styles.recentAction}>
                <Ionicons name="refresh-outline" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
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
    padding: 20,
  },
  // Hero Section
  heroSection: {
    marginBottom: 24,
  },
  heroContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Actions Section
  actionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
  // Join Section
  joinSection: {
    marginBottom: 24,
  },
  joinCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  joinButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  joinButtonTextDisabled: {
    color: '#9ca3af',
  },
  joinButtonIcon: {
    marginLeft: 8,
  },
  // Recent Section
  recentSection: {
    marginBottom: 24,
  },
  recentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  recentTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  recentAction: {
    padding: 8,
  },
});
