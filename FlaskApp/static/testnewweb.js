import http from 'k6/http';
import { sleep } from 'k6';

export default function() {
  http.get('http://newweb.stuartgeiger.com/');
  http.get('https://newweb.stuartgeiger.com/teaching/');
  http.get('https://newweb.stuartgeiger.com/articles/');
  sleep(1);
  http.get('https://newweb.stuartgeiger.com/talks/');
}
