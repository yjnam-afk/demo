# 데모 모델 서버 배포

포털(Vercel)이 호출할 수 있도록 사내 서버의 Gradio 앱을 인터넷에 여는 설정이다.
대상은 `AETEM Model Test` (Gradio 5.9.1, `process_img(model_selector, image)`).

포털은 **서버 대 서버**로 호출한다. 방문자 브라우저가 아니라 우리 함수가
이 주소를 부르므로, 사내망 주소(`10.100.110.102:7865`)로는 닿지 않는다.
그 주소를 인터넷에서 닿는 이름으로 바꾸는 것이 이 문서의 전부다.

---

## 두 갈래 — 하나만 고르면 된다

### A. 공인 도메인 + 리버스 프록시 (정식)

사내 서버에 인바운드 443 을 열 수 있을 때. 도메인 하나와 인증서가 필요하다.

```
인터넷 ──443──▶ [Caddy · 사내 서버] ──127.0.0.1:7865──▶ Gradio
```

1. DNS 에 A 레코드 추가 — 예: `demo-ai.infiniq.co.kr` → 서버 공인 IP
2. 방화벽에서 443 인바운드 허용 (80 은 인증서 발급용으로 잠깐 필요)
3. `Caddyfile` 을 `/etc/caddy/Caddyfile` 로 복사하고 도메인만 바꾼 뒤
   `systemctl reload caddy` — 인증서는 Caddy 가 자동 발급·갱신한다
4. Gradio 는 바깥에 직접 열지 않는다. `server_name="127.0.0.1"` 로 묶는다

### B. 아웃바운드 터널 (방화벽 개방이 어려울 때)

인바운드 포트를 열지 않는다. 서버가 밖으로 나가는 연결만 쓰므로 보안 검토가 가볍다.

```
인터넷 ──▶ [Cloudflare] ◀──아웃바운드──[cloudflared · 사내 서버] ──▶ Gradio
```

1. `cloudflared` 설치 후 터널 생성 — 고정 주소를 쓰려면 회사 도메인을 연결한다
2. `cloudflared.service` 를 `/etc/systemd/system/` 에 두고 `systemctl enable --now cloudflared`
3. 임시로 확인만 할 거면 `cloudflared tunnel --url http://localhost:7865` 한 줄이면
   `*.trycloudflare.com` 주소가 즉시 뜬다 — 다만 재시작할 때마다 주소가 바뀐다

---

## 상시 가동

데모는 영업 링크로 아무 때나 열리므로 프로세스가 항상 떠 있어야 한다.
`aetem-demo.service` 가 그 역할을 한다 — 부팅 시 자동 시작, 죽으면 재시작.

```bash
sudo cp aetem-demo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now aetem-demo
systemctl status aetem-demo
```

모델 8 개를 요청마다 로드하면 첫 응답이 수십 초가 된다. 프로세스가 뜰 때
한 번 올려 두고 재사용하도록 앱을 구성한다 (VRAM 이 부족하면 자주 쓰는
모델만 상주시키고 나머지는 지연 로드).

---

## 포털 쪽 설정 (관리자 화면)

주소가 생기면 어드민에서 이렇게 채운다.

| 칸 | 값 |
| --- | --- |
| 데모 유형 | API 연동 |
| 엔드포인트 | `https://demo-ai.infiniq.co.kr` |
| API 이름 | `/process_img` |
| 입력 형태 | 이미지 업로드 |
| 방문자 업로드 | 끔 (준비된 샘플만) |

**고를 수 있는 모델** — 이 앱은 모델을 첫 인자로 받으므로 주소는 비우고
모델 값만 채운다.

| 이름 | 모델 값 | 주소 | 단서 |
| --- | --- | --- | --- |
| MoCaE(RDC+RTMDet) | `MoCaE(RDC+RTMDet)` | (비움) | mAP 82.2 |
| RTMDet | `RTMDet` | (비움) | mAP 81.33 |
| Prototype 6 | `Prototype_Model6` | (비움) | mAP 81.3 |
| Prototype 5 | `Prototype_Model5` | (비움) | mAP 81.1 |
| Prototype 4 | `Prototype_Model4` | (비움) | mAP 79.5 |
| Prototype 3 | `Prototype_Model3` | (비움) | mAP 79.4 |
| Prototype 2 | `Prototype_Model2` | (비움) | mAP 78.7 |
| Prototype 1 | `Prototype_Model1` | (비움) | mAP 78.1 |

샘플 이미지는 관리자 미디어 구간에 올린 뒤 돌려받은 `/api/media/...` 경로를
샘플 경로 칸에 넣는다.

---

## 확인 순서

한 단계씩 끊어서 확인해야 어디서 막혔는지 알 수 있다.

```bash
# 1) 서버 안에서 앱이 살아 있는가
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7865/

# 2) 밖에서 도메인이 닿는가 (사무실 밖 네트워크나 휴대폰에서)
curl -sS -o /dev/null -w '%{http_code}\n' https://demo-ai.infiniq.co.kr/

# 3) API 계약이 그대로인가 — 파라미터·반환이 보인다
curl -sS https://demo-ai.infiniq.co.kr/gradio_api/info | head -c 400
```

셋 다 통과하면 관리자 화면의 **상태 확인** 버튼을 누른다. 여기서 실패하면
남은 원인은 포털 쪽이므로 그때는 이쪽에서 잡는다.

---

## 열어 두기 전에

공개 주소가 되면 아무나 GPU 를 돌릴 수 있게 된다. 최소한 이 둘은 걸어 둔다.

- **속도 제한** — Caddy 설정에 동시 요청·분당 요청 상한 (아래 주석 참고)
- **업로드 크기 제한** — 큰 파일이 GPU 큐를 막지 않도록 (기본 20MB)

모델 가중치나 학습 데이터가 노출되는 경로는 없다. Gradio 는 추론 결과만
내보내고, 포털은 그 결과를 다시 우리 도메인으로 중계한다.
