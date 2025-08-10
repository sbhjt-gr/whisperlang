import React, { useState, useLayoutEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Input, Text, Image } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

export default function HomeScreen({ navigation, route }: Props) {
  const [id, setID] = useState<string>('');
  

  
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <Image source={require('../../assets/video-call-blue.png')} style={{ width: 160, height: 160, marginBottom: 20, marginTop: 10 }} />
        <Text h3 style={{ color: '#696969', marginBottom: 12 }}>All your meetings!</Text>
        <Button
          title="Start WebRTC Video Call"
          size="lg"
          titleStyle={{ fontWeight: '700' }}
          buttonStyle={{
            backgroundColor: 'rgb(32, 137, 220)',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 30,
          }}
          containerStyle={{
            width: 350,
            marginHorizontal: 50,
            marginVertical: 10,
          }}
          onPress={createMeeting}
        />
        <Text h3 style={{ marginBottom: 30, marginTop: 30, color: '#696969' }}>Join a meeting</Text>
        <Input 
          keyboardType='decimal-pad' 
          placeholder="Enter the meeting ID" 
          value={id} 
          containerStyle={{
            width: 370
          }} 
          onChangeText={(text: string) => setID(text)} 
        />
        <Button
          onPress={meet}
          title="Join the Meeting"
          size="lg"
          containerStyle={{
            width: 350,
            marginHorizontal: 50,
            marginVertical: 10,
          }} 
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    top: 20,
    alignItems: "center",
  },
  input: {
    marginTop: 10
  },
  button: {
    marginTop: 10,
    marginBottom: 10
  }
}); 