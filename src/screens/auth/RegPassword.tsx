import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Modal, Image, useWindowDimensions} from 'react-native';
import { Button, Input, Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { registerWithEmail } from '../../services/FirebaseService';
import * as Progress from 'react-native-progress';
import { RootStackParamList } from '../../types/navigation';

type RegPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'RegPassword'>;
type RegPasswordRouteProp = RouteProp<RootStackParamList, 'RegPassword'>;

interface Props {
  navigation: RegPasswordNavigationProp;
  route: RegPasswordRouteProp;
}

export default function RegPassword({ navigation, route }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {width} = useWindowDimensions();
  const [password, setPassword] = useState<string>("");
  
  const signUp = async (): Promise<void> => {
    if(password) {
      try {
        setIsLoading(true);
        const result = await registerWithEmail(route.params.name, route.params.email, password);
        if (!result.success) {
          alert(result.error || 'Registration failed');
          setIsLoading(false);
        }
        if (result.passwordWarning) {
          alert(result.passwordWarning);
        }
      } catch (error: any) {
        alert('Registration failed. Please try again.');
        setIsLoading(false);
      }
    } else {
      alert("Create a password first!");
    }
  };
  
  useEffect(() => {
    import('@react-native-firebase/auth').then(({ default: auth }) => {
      const unsubscribe = auth().onAuthStateChanged((authUser: any) => {
        if (authUser) {
          navigation.replace('HomeScreen', {signedUp: 1});
        }
      });
      return unsubscribe;
    });
  }, []);
    
  return (
    <KeyboardAvoidingView behavior='padding'>
      <View style={styles.bottomElement}>
        <Modal visible={isLoading} transparent>
          <View style={styles.modal}>
          <Progress.Bar width={width*.6} indeterminate={true}  />
          </View>
        </Modal>
        <Text h3 style={{ marginBottom: 30, color: '#696969' }}>Set a password</Text>
        <Input
          placeholder="Set Password"
          containerStyle={{
            width: 370
          }}
          secureTextEntry
          value={password}
          onChangeText={(text: string) => setPassword(text)}
          onSubmitEditing={signUp}
        />
        <Button 
          onPress={signUp} 
          title="Sign Up" 
          containerStyle={{
            width: 350,
            marginHorizontal: 50,
            marginVertical: 10,
          }} 
          size="lg" 
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bottomElement: {
    top: 50,
    alignItems: "center",
  },
    button: {
    marginTop: 10,
    width: 900
  },
  modal:{
    flex:1,
    backgroundColor:'#eee',
    opacity:.8,
    alignItems:'center', 
    justifyContent:'center',
  },
}); 