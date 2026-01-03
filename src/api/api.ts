import axios from "axios";
// const API_BASE_URL = "https://schoolmanager.gerexatlas.com/";
const API_BASE_URL = "http://localhost:8000/";
export const api =
  typeof window !== "undefined" && sessionStorage
    ? axios.create({
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",

          ...(sessionStorage.getItem("access_token")
            ? {
                Authorization: `Bearer ${sessionStorage.getItem(
                  "access_token"
                )}`,
              }
            : {}),
        },
        withCredentials: false,
      })
    : axios.create({
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
