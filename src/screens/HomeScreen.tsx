import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Text, Image } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import AnimatedHeader from '../components/AnimatedHeader';
import GradientButton from '../components/GradientButton';
import GlassInput from '../components/GlassInput';
import QuickActionCard from '../components/QuickActionCard';
import GradientCard from '../components/GradientCard';
import { auth } from '../config/firebase';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

export default function HomeScreen({ navigation, route }: Props) {
  const [id, setID] = useState<string>('');
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
  
  const meet = (): void => {
    if (id) {
      navigation.navigate('VideoCallScreen', {id: parseInt(id), type: 1});
    } else {
      alert("Enter the meeting ID!");
    }
  };
  
  const createMeeting = (): void => {
    navigation.navigate('UsersScreen');
  };
  
  const LogOut = async (): Promise<void> => {
    await auth.signOut().then(() => {
      navigation.replace("LoginScreen");
    });
  };
  
  return (
    <View style={styles.container}>
      <AnimatedHeader
        title="WhisperLang"
        subtitle="Connect through secure video calls"
      >
        <Image source={require('../../assets/video-call-blue.png')} style={styles.headerImage} />
      </AnimatedHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View
            style={[
              styles.mainCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <GradientCard colors={['#00d4aa', '#0066cc']} style={styles.startCallCard}>
              <Text style={styles.cardTitle}>Start New Call</Text>
              <Text style={styles.cardSubtitle}>Begin a secure video call with anyone</Text>
              
              <GradientButton
                title="Start WebRTC Video Call"
                onPress={createMeeting}
                icon="videocam"
                colors={['#38ef7d', '#11998e']}
                style={styles.startButton}
              />
            </GradientCard>
          </Animated.View>

          <Animated.View
            style={[
              styles.joinSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Join Meeting</Text>
            
            <GlassInput
              placeholder="Enter meeting ID"
              value={id}
              onChangeText={(text: string) => setID(text)}
              keyboardType="decimal-pad"
              icon="enter-outline"
              containerStyle={styles.inputContainer}
            />
            
            <GradientButton
              title="Join Meeting"
              onPress={meet}
              icon="log-in"
              style={styles.joinButton}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.quickActions,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionsGrid}>
              <QuickActionCard
                title="Settings"
                subtitle="App preferences"
                icon="settings-outline"
                colors={['#ff9a9e', '#fecfef']}
                onPress={() => {}}
              />
              
              <QuickActionCard
                title="History"
                subtitle="Call logs"
                icon="time-outline"
                colors={['#a8edea', '#fed6e3']}
                onPress={() => {}}
              />
            </View>
            
            <View style={styles.actionsGrid}>
              <QuickActionCard
                title="Contacts"
                subtitle="Manage contacts"
                icon="people-outline"
                colors={['#11998e', '#38ef7d']}
                onPress={() => {}}
              />
              
              <QuickActionCard
                title="Log Out"
                subtitle="Sign out"
                icon="log-out-outline"
                colors={['#ff6b6b', '#ee5a52']}
                onPress={LogOut}
              />
            </View>
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
  mainCard: {
    marginTop: 20,
    marginBottom: 30,
  },
  startCallCard: {
    alignItems: 'center',
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    textAlign: 'center',
  },
  startButton: {
    width: '100%',
  },
  joinSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  joinButton: {
    width: '100%',
  },
  quickActions: {
    marginBottom: 30,
  },
  actionsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
}); 