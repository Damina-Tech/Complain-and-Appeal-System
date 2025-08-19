import axios from "axios";
const API_URL = process.env.NEXT_PUBLIC_API_URL; 

export const listCases = async (token: string) => {
  const res = await axios.get(`${API_URL}/cases/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const createCase = async (payload: any, token: string) => {
  const res = await axios.post(`${API_URL}/cases/`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateCase = async (id: number | string, payload: any, token: string) => {
  const res = await axios.patch(`${API_URL}/cases/${id}/`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteCase = async (id: number | string, token: string) => {
  await axios.delete(`${API_URL}/cases/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};