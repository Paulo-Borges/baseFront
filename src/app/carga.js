import http from 'k6/http';

export const options = { vus: 50, duration: '10s' };

export default function () {
  http.get('https://localhost:7277/api/Contato/assincrono');
}
