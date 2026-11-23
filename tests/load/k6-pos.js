import http from "k6/http"; import { check, sleep } from "k6";
export const options = { stages: [{ duration: "30s", target: 20 }, { duration: "1m", target: 50 }, { duration: "30s", target: 0 }], thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<800"] } };
const H = { apikey: __ENV.KEY, Authorization: `Bearer ${__ENV.KEY}`, "Content-Type": "application/json" };
export default function () {
  const m = http.get(`${__ENV.URL}/rest/v1/menu_items?select=id,name,price&limit=100`, { headers: H }); check(m, { "menu 200": r => r.status === 200 });
  const l = http.post(`${__ENV.URL}/rest/v1/rpc/get_league`, JSON.stringify({ period: "week", lim: 10 }), { headers: H }); check(l, { "league 200": r => r.status === 200 });
  sleep(1);
}
