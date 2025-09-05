import React from 'react';
import VideoCallScreen from './VideoCallScreen';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

type MultiVideoCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoCallScreen'>;
type MultiVideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCallScreen'>;

interface Props {
  navigation: MultiVideoCallScreenNavigationProp;
  route: MultiVideoCallScreenRouteProp;
}

export default function MultiVideoCallScreen({ navigation, route }: Props) {
  return <VideoCallScreen navigation={navigation} route={route} />;
}
