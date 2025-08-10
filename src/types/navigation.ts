export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: { signedUp?: number };
  RegisterScreen: undefined;
  VideoCallScreen: { id: number; type?: number };
  UsersScreen: undefined;
}; 