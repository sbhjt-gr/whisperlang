import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Modal, Image, useWindowDimensions, Platform} from 'react-native';
import { Button, Input, Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { loginWithEmail, initializeFirebase, onAuthStateChanged } from '../../services/FirebaseService';
import { getAuthInstance } from '../../services/FirebaseInstances';
import * as Progress from 'react-native-progress';
import { RootStackParamList } from '../../types/navigation';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {width} = useWindowDimensions();
  const [password, setPassword] = useState<string>("");
  
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
        
        import('@react-native-firebase/auth').then(({ default: auth }) => {
          const unsubscribe = auth().onAuthStateChanged((authUser: any) => {
            if (authUser) {
              navigation.replace('HomeScreen', {signedUp: 0});
            } else {
              setIsLoading(false);
            }
          });
          return unsubscribe;
        });
      } catch (error) {
        setIsLoading(false);
        console.error('Firebase initialization failed:', error);
      }
    };
    
    initAuth();
  }, []);
    
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
      <Modal visible={isLoading} transparent>
        <View style={styles.modal}>
        <Progress.Bar width={width*.6} indeterminate={true}  />
        </View>
      </Modal>
             <Image source={require('../../../assets/video-call-blue.png')} style={{ width: 160, height: 160, marginBottom: 26 }} />
      <Text h3 style={{ color: '#696969', marginBottom: -33 }}>Log into your account{'\n'}</Text>
      <Text style={{ color: '#696969', marginBottom: 30, fontSize: 13 }}>(Project done under Bengal Institute of Technology)</Text>
      <Input 
        placeholder="E-mail ID" 
        value={email} 
        containerStyle={{ width: 370 }} 
        onChangeText={(text: string) => setEmail(text)} 
      />
      <Input 
        placeholder="Password" 
        secureTextEntry 
        value={password} 
        onChangeText={(text: string) => setPassword(text)} 
        onSubmitEditing={signIn} 
        containerStyle={{
          width: 370
        }} 
      />
      <Button 
        onPress={signIn} 
        title="Log In" 
        containerStyle={{
          width: 350,
          marginHorizontal: 50,
          marginVertical: 10,
        }} 
        size="lg" 
      />
      <Button 
        onPress={() => {
          navigation.navigate('RegName');
        }} 
        title="Register" 
        size="lg" 
        type="outline" 
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
    top: '9%',
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    marginTop: 10,
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
  },
  modal: {
    flex:1,
    backgroundColor:'#eee',
    opacity:.8,
    alignItems:'center', 
    justifyContent:'center',
  },
}); 