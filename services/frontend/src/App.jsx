import { io } from "socket.io-client";
import { useState } from "react";

import Login from "./components/Login";
import FleetMap from "./components/FleetMap";

import "./index.css";

export default function App() {

  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  //
  // SOCKET.IO
  //
  const socket = io(
    "http://192.168.10.15:3000",
    {
      auth: {
        token
      }
    }
  );

  function handleLogout() {

    localStorage.removeItem("token");

    setToken(null);

  }

  if (!token) {

    return (
      <Login onLogin={setToken} />
    );

  }

  return (
    <FleetMap
      token={token}
      socket={socket}
      onLogout={handleLogout}
    />
  );

}
