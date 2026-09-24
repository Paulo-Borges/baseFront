import http from 'k6/http';
import { environment } from '../environments/environment';
export const options = { vus: 50, duration: '10s' };

export default function () {
  http.get(`${environment.ApiUrl}/Contato/assincrono`);
}
