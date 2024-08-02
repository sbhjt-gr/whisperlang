import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, ImageBackground, StyleSheet, Dimensions  } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeMain from './HomeMain.js';
import LoginScreen from './registration/LoginScreen.js';
import RegName from './registration/RegName.js';
import RegNumber from './registration/RegNumber.js';
import RegEmailID from './registration/RegEmailID.js';
import RegPassword from './registration/RegPassword.js';
import { auth } from "./firebase.js"
import VideoCallPage from './VideoCallPage.js';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer theme={{...DefaultTheme, colors: {...DefaultTheme.colors, background: 'rgba(64,171,250, 0.15'}}}>
      <StatusBar backgroundColor='#4875FF' barStyle='light-content' />
        <SafeAreaProvider>
          <ImageBackground style={{height: screenHeight, width: screenWidth}} source={require('./image/background.jpg')} resizeMode="cover">
            <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#4875FF'}, headerTintColor: '#fff'}} initialRouteName="LoginScreen">
              <Stack.Screen name = "LoginScreen" component = {LoginScreen} options = {{title: 'Log into your account!'}} 
              /><Stack.Screen
                name = "HomeMain"
                component = {HomeMain}
                options = {{title: 'Welcome, ' + auth?.currentUser?.displayName + '!'}} />
                <Stack.Screen
                name = "RegName"
                component = {RegName}
                options = {{title: 'Enter your name'}}
                /><Stack.Screen
                name = "RegNumber"
                component = {RegNumber}
                options = {{title: 'Enter your phone number'}}
                /><Stack.Screen
                name = "RegEmailID"
                component = {RegEmailID}
                options = {{title: 'Enter e-mail ID'}}
                /><Stack.Screen
                name = "RegPassword"
                component = {RegPassword}
                options = {{title: 'Create a Password'}}
                /><Stack.Screen
                name = "VideoCallPage" 
                component = {VideoCallPage}
                options={{ headerShown: false }}
              />
          </Stack.Navigator>
        </ImageBackground>
      </SafeAreaProvider>
    </NavigationContainer>
    );
}

const styles = StyleSheet.create({
  imageBack: {
    height: screenHeight,
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5
  }
})

