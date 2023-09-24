import React from "react";
import { View } from "react-native";
import AppNavigator from './navigator'; // Replace with the correct path to your navigation setup

const App = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      {/* Other components or screens */}
      <AppNavigator  />
      {/* Other components or screens */}
    </View>
  );
};

export default App;
