export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: { signedUp?: number };
  RegName: undefined;
  RegNumber: { name: string };
  RegEmailID: { name: string; number?: string };
  RegPassword: { email: string; name: string };
  VideoCallScreen: { id: number; type?: number };
}; 