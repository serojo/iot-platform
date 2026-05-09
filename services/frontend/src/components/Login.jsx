import { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {

    e.preventDefault();

    try {

      const response = await axios.post(
        "http://192.168.10.15:3000/login",
        {
          username,
          password
        }
      );

      const token = response.data.token;

      localStorage.setItem("token", token);

      onLogin(token);

    } catch (err) {

      setError("Invalid credentials");

    }

  }

  return (

    <div className="login-container">

      <form onSubmit={handleLogin} className="login-box">

        <h2>IoT Platform Login</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">
          Login
        </button>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

      </form>

    </div>

  );

}
