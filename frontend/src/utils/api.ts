import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

export const loginUser = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/login/`, {
      username,
      password,
    });
    return response.data; // contains JWT token
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await axios.get(`${API_URL}/logout/`);
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    // proceed anyway; client will clear token
  }
};