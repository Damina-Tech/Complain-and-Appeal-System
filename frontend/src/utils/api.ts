import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const loginUser = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/login/`, {
      username,
      password,
    });
    console.log("Login successful", response.data);
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

export const requestPasswordReset = async (email: string) => {
  try {
    const response = await axios.post(`${API_URL}/password/forgot/`, { email });
    return response.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
};

export const submitPasswordReset = async ({
  userId,
  token,
  newPassword,
}: {
  userId: string;
  token: string;
  newPassword: string;
}) => {
  try {
    const response = await axios.post(`${API_URL}/password/reset/`, {
      userId,
      token,
      newPassword,
    });
    return response.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
};

export const submitCaseFeedback = async (
  caseId: string | number,
  rating: number,
  comment: string,
  token: string,
) => {
  try {
    const response = await axios.post(
      `${API_URL}/cases/${caseId}/submit_feedback/`,
      { rating, comment },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
};

export const submitCaseAppeal = async (
  caseId: string | number,
  reason: string,
  toOfficeId?: number | string,
  token?: string,
) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const data: { reason: string; to_office_id?: number | string } = { reason };
    if (toOfficeId) {
      data.to_office_id = toOfficeId;
    }
    const response = await axios.post(
      `${API_URL}/cases/${caseId}/submit_appeal/`,
      data,
      { headers },
    );
    return response.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
};

export const changePassword = async (
  oldPassword: string,
  newPassword: string,
  token: string,
) => {
  try {
    const response = await axios.post(
      `${API_URL}/password/change/`,
      {
        old_password: oldPassword,
        new_password: newPassword,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
};