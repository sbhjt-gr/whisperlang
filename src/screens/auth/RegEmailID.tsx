import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { Button, Input, Text} from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { auth } from "../../config/firebase";
import { User } from 'firebase/auth';
import { RootStackParamList } from '../../types/navigation';

type RegEmailIDNavigationProp = StackNavigationProp<RootStackParamList, 'RegEmailID'>;
type RegEmailIDRouteProp = RouteProp<RootStackParamList, 'RegEmailID'>;

interface Props {
  navigation: RegEmailIDNavigationProp;
  route: RegEmailIDRouteProp;
}

export default function RegEmailID({ navigation, route }: Props) {
    const [email, setEmail] = useState<string>("");
    
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
      <Text h3 style={{marginBottom: 30, color: '#696969' }}>Enter your e-mail ID</Text>
      <Input 
        placeholder="E-mail ID" 
        containerStyle={{
          width: 370
        }} 
        value={email} 
        onChangeText={(text: string) => setEmail(text)} 
      />
      <Button 
        onPress={() => {
        if(!email) {
          alert('Enter your email ID');
        } else {
          navigation.navigate('RegPassword', {email: email, name: route.params.name});
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
    },  button: {
      marginTop: 10,
      width: 900
    },
  }); 