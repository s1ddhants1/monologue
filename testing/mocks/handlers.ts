import { http, HttpResponse } from "msw";
import { SOURCE_BASE_URL } from "@/config/env";

export const handlers = [
  http.get(`${SOURCE_BASE_URL}/mock-success`, () => {
    return new HttpResponse("ok", { status: 200 });
  }),
  http.get(`${SOURCE_BASE_URL}/not-found`, () => {
    return new HttpResponse("Not Found", { status: 404, statusText: "Not Found" });
  }),
  http.get("https://example.com/api", () => {
    return new HttpResponse("ok", { status: 200 });
  }),
];
