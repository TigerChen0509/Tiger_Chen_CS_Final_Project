import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddTaskScreen from '../screens/AddTaskScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DesktopShell from '../components/layout/DesktopShell';
import { Task } from '../types/task';
import { useAuth } from '../utils/authContext';

export type RootStackParamList = {
  Main: undefined;
  AddTask: { task?: Task };
  TaskDetail: { taskId: string };
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function MainApp() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={DesktopShell} />
      <RootStack.Screen name="AddTask" component={AddTaskScreen} options={{ presentation: 'transparentModal' }} />
      <RootStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ presentation: 'transparentModal' }} />
    </RootStack.Navigator>
  );
}

function AuthFlow() {
  const { refresh } = useAuth();
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn">
        {(props) => <SignInScreen {...props} onSignIn={refresh} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="SignUp">
        {(props) => <SignUpScreen {...props} onSignIn={refresh} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn } = useAuth();
  return (
    <NavigationContainer>
      {isLoggedIn ? <MainApp /> : <AuthFlow />}
    </NavigationContainer>
  );
}
