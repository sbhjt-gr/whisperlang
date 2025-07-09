import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { Button, Input, Text} from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { auth } from "../../config/firebase";
import { User } from 'firebase/auth';
import { RootStackParamList } from '../../types/navigation';

type RegNumberNavigationProp = StackNavigationProp<RootStackParamList, 'RegNumber'>;
type RegNumberRouteProp = RouteProp<RootStackParamList, 'RegNumber'>;

interface Props {
  navigation: RegNumberNavigationProp;
  route: RegNumberRouteProp;
}

export default function RegNumber({ navigation, route }: Props) {
  const [number, setNumber] = useState<string>("");
  
  useEffect(() => {
         const unsubscribe = auth.onAuthStateChanged((authUser: User | null) => {
         if(authUser) {
             navigation.replace('HomeScreen', {});
         }
     });
    return unsubscribe;
    }, []);
    
  return (
    <KeyboardAvoidingView behavior='padding'>
      <View style={styles.bottomElement}>
      <Text h3 style={{marginBottom: 30, color: '#696969'}}>Enter your phone number</Text>
      <Input 
        containerStyle={{
          width: 370
        }} 
        placeholder="Phone Number" 
        maxLength={10} 
        autoFocus 
        value={number} 
        keyboardType='decimal-pad' 
        onChangeText={(text: string) => setNumber(text)} 
      />
      <Button 
        onPress={() => {
        if(number.length != 10) {
          alert('Phone number should be of 10 digits.');
        } else { 
          navigation.navigate('RegEmailID', { name: route.params.name, number: number });
        }}} 
        title="Next" 
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
  }); 