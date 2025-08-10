import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import CallsScreen from './tabs/CallsScreen';
import ContactsScreen from './tabs/ContactsScreen';
import HistoryScreen from './tabs/HistoryScreen';
import SettingsScreen from './tabs/SettingsScreen';

type TabNavigatorNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
type TabNavigatorRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: TabNavigatorNavigationProp;
  route: TabNavigatorRouteProp;
}

type TabType = 'calls' | 'contacts' | 'history' | 'settings';

interface TabItem {
  key: TabType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

const tabs: TabItem[] = [
  {
    key: 'calls',
    title: 'Calls',
    icon: 'videocam-outline',
    iconFocused: 'videocam',
  },
  {
    key: 'contacts',
    title: 'Contacts',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  {
    key: 'history',
    title: 'History',
    icon: 'time-outline',
    iconFocused: 'time',
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    iconFocused: 'settings',
  },
];

export default function TabNavigator({ navigation, route }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('calls');

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'calls': return 'WhisperLang';
      case 'contacts': return 'Contacts';
      case 'history': return 'Call History';
      case 'settings': return 'Settings';
      default: return 'WhisperLang';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calls':
        return <CallsScreen navigation={navigation} />;
      case 'contacts':
        return <ContactsScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen navigation={navigation} />;
      default:
        return <CallsScreen navigation={navigation} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Ionicons name="videocam" size={20} color="#ffffff" />
              </View>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="search-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={20} color="#ffffff" />
                <View style={styles.notificationBadge}>
                  <View style={styles.notificationDot} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={[styles.tabIconContainer, activeTab === tab.key && styles.tabIconContainerActive]}>
              <Ionicons
                name={activeTab === tab.key ? tab.iconFocused : tab.icon}
                size={22}
                color={activeTab === tab.key ? '#667eea' : '#9ca3af'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.tabLabelActive
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIconContainer: {
    marginBottom: 4,
  },
  tabIconContainerActive: {
    // Add any active state styling if needed
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
  },
  tabLabelActive: {
    color: '#667eea',
    fontWeight: '600',
  },
});
