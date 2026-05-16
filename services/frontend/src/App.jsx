import { io } from "socket.io-client";
import { useEffect, useState } from "react";

import Login from "./components/Login";
import FleetMap from "./components/FleetMap";

import "./index.css";

export default function App() {

  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [socket, setSocket] =
    useState(null);

  //
  // SOCKET.IO
  //
  useEffect(() => {

    if (!token) return;

    const s = io(
      "http://192.168.10.15:3000",
      {
        auth: {
          token
        }
      }
    );

    setSocket(s);

    return () => {
      s.disconnect();
    };

  }, [token]);

  function handleLogout() {

    localStorage.removeItem("token");

    if (socket) {
      socket.disconnect();
    }

    setToken(null);

  }

  if (!token) {

    return (
      <Login onLogin={setToken} />
    );

  }

  if (!socket) {

    return (
      <div>
        Connecting realtime...
      </div>
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
