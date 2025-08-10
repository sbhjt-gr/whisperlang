export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: { signedUp?: number };
  RegisterScreen: undefined;
  VideoCallScreen: { id: number; type?: number };
  UsersScreen: undefined;
};

export type TabParamList = {
  CallsTab: undefined;
  ContactsTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
}; 