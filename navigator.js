import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import alertForm from './forms/send_alert_form';
import CameraRecordPage from './modules/CameraRecordPage';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AlertForm">
        <Stack.Screen name="AlertForm" title="Home" component={alertForm} options={{headerShown:false}}  />
        <Stack.Screen   name="CameraRecordPage" title="Camera"  component={CameraRecordPage} options={{ title: 'Create Evidence',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          color: 'black',
          fontWeight: 'bold',
          fontSize: 20, // Adjust the font size as needed
        },
        headerTintColor: 'black',
        headerBackTitle: 'Back', // Customize the back button title 
        }} />
        {/* Add other screens as needed */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
