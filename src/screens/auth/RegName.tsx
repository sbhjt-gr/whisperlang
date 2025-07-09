import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { Button, Input, Text} from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from "../../config/firebase";
import { User } from 'firebase/auth';
import { RootStackParamList } from '../../types/navigation';

type RegNameNavigationProp = StackNavigationProp<RootStackParamList, 'RegName'>;

interface Props {
  navigation: RegNameNavigationProp;
}

export default function RegName({ navigation }: Props) {
  const [name, setName] = useState<string>("");
  
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
      <Text h3 style={{marginBottom: 30, color: '#696969'}}>Enter your full name</Text>
      <Input 
        containerStyle={{
          width: 370
        }} 
        placeholder="Full Name" 
        autoFocus 
        value={name} 
        onChangeText={(text: string) => setName(text)} 
      />
      <Button 
        onPress={() => {
        if(!name) {
          alert('Enter your name first');
        } else { 
          navigation.navigate('RegEmailID', { name: name });
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