import axios from "axios";
const API_URL = process.env.NEXT_PUBLIC_API_URL; 

export const listUsers = async (token: string) => {
    const res = await axios.get(`${API_URL}/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };
  
  export const createUser = async (data: any, token: string) => {
    const res = await axios.post(`${API_URL}/users/`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };
  
  export const getUser = async (id: number | string, token: string) => {
    const res = await axios.get(`${API_URL}/users/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };
  
  export const updateUser = async (id: number | string, data: any, token: string) => {
    const res = await axios.patch(`${API_URL}/users/${id}/`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };
  
  export const deleteUser = async (id: number | string, token: string) => {
    await axios.delete(`${API_URL}/users/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };