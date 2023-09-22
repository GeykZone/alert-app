import React from "react";
import { View } from "react-native";
import LoginForms from "./forms/send_alert_form"; // Import the Registration component

const App = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      {/* Other components or screens */}
      <LoginForms />
      {/* Other components or screens */}
    </View>
  );
};

export default App;
