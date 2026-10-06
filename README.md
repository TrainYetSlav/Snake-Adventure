# Snake Adventure — Backend

Backend Node.js + Express cho Snake Adventure. Phạm vi hiện tại chỉ gồm API, nghiệp vụ và tài liệu tích hợp. Không có frontend, HTML, CSS, game engine phía trình duyệt, SQL, schema, migration hay kết nối database.

## Trạng thái hiện tại

- Đã có đăng ký, đăng nhập, đăng xuất, thông tin phiên, cấu hình game, lưu thành tích, kỷ lục cá nhân, lịch sử và bảng xếp hạng.
- Repository hiện tại dùng `Map` trong bộ nhớ của tiến trình để FE có thể thử API. **Khởi động lại server sẽ mất tài khoản, phiên đăng nhập và thành tích.** Không có file dữ liệu được ghi ra đĩa.
- Hệ số điểm Classic/The Hunt chưa chốt, giữ `null`. Số màn, loại mồi, số lượng mỗi loại và tỷ lệ mồi mới/cũ chưa chốt, không tạo dữ liệu mẫu vào cấu hình thật.
- Với cấu hình hiện tại, API lưu điểm trả `409 SCORING_NOT_CONFIGURED`; lịch sử và bảng xếp hạng ban đầu rỗng. FE có thể tích hợp tài khoản và các API đọc ngay.
- Các hệ số trong `backend/test/helpers.js` chỉ là fixture kiểm thử, **không phải thông số của game**.

## Chạy backend

Yêu cầu Node.js 24 trở lên. Chạy lệnh tại thư mục `backend`:

```powershell
cd backend
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

Nếu dùng npm, có thể chạy `npm install`, `npm run dev`, `npm test`, `npm run check`. Lockfile đã cung cấp thuộc pnpm; dùng pnpm để cài đúng dependency đã kiểm thử.

Sau khi dependency đã cài, có thể chạy trực tiếp mà không cần lệnh npm/pnpm:

```powershell
node --env-file-if-exists=.env src/server.js
node scripts/check.js
node --test test/api.test.js test/scoring.test.js test/environment.test.js
```

API mặc định: `http://127.0.0.1:3000/api/v1`. Server không phục vụ trang web. Kiểm tra hoạt động bằng:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
```

Máy hiện tại có Node.js nhưng chưa có lệnh npm trong PATH. Dependency đã được cài bằng pnpm đi kèm runtime. Nếu cần dùng đúng pnpm này trên máy hiện tại:

```powershell
node 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.mjs' install --frozen-lockfile
```

`pnpm-workspace.yaml` cấu hình sao chép dependency để dùng được trên ổ exFAT, vốn không hỗ trợ symlink.

## Cấu hình môi trường

Sao chép `backend/.env.example` thành `backend/.env`. Không đưa `.env` vào Git.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Địa chỉ lắng nghe |
| `PORT` | `3000` | Cổng API |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origin FE được phép, phân cách bằng dấu phẩy, không có path hoặc dấu `/` cuối |
| `SESSION_TTL_SECONDS` | `604800` | Thời hạn phiên, mặc định 7 ngày |
| `COOKIE_SECURE` | `false` | Chỉ cho gửi cookie qua HTTPS khi bật |
| `COOKIE_SAME_SITE` | `lax` | `lax`, `strict` hoặc `none`; `none` bắt buộc `COOKIE_SECURE=true` |
| `AUTH_RATE_LIMIT_MAX` | `20` | Tổng yêu cầu đăng ký/đăng nhập tối đa mỗi IP trong một cửa sổ |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `900` | Cửa sổ giới hạn yêu cầu xác thực |

Thêm origin thực tế của FE vào `ALLOWED_ORIGINS`. Frontend nên dùng cùng hostname với backend: cùng `localhost` hoặc cùng `127.0.0.1`, tránh trộn hai hostname vì cookie SameSite. Origin `null`, trang mở bằng `file://` và origin không được phép sẽ bị từ chối.

Nếu FE và API khác site trên HTTPS, cấu hình `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true` và origin FE cụ thể. Chính sách chặn cookie bên thứ ba của trình duyệt vẫn có thể ảnh hưởng; có thể dùng reverse proxy để đưa API về cùng origin FE.

## Kiến trúc

```text
README.md
backend/
  src/
    app.js                     # Application factory and dependency injection
    server.js                  # Server startup and shutdown
    config/
      environment.js           # Validated environment settings
      game-rules.js            # Draft rules, empty scoring coefficients
    core/
      errors.js                # API error types
      validation.js            # Request validation
      passwords.js             # Password hashing and verification
    http/
      middleware.js            # CORS, cookies, rate limits, error responses
      routes.js                # HTTP endpoints
    modules/
      auth/service.js          # Account and session business logic
      scores/service.js        # Score calculation, records, history, ranking
    repositories/memory.js     # Temporary repository adapters
  scripts/check.js             # JavaScript syntax checks
  test/                        # HTTP and business-rule tests
  docs/repositories.md         # Adapter contract for the database owner
```

Luồng backend: **HTTP route → kiểm tra đầu vào/xác thực → service → repository → phản hồi JSON**. Service không phụ thuộc database cụ thể. Người phụ trách database có thể viết adapter theo [repository contract](backend/docs/repositories.md) rồi truyền vào `createApp({ repositories })`.

Frontend tự xử lý di chuyển, va chạm, AI con mồi, tạm dừng và cổng. Backend không điều khiển rắn và không nhận request mỗi tick.

## Quy ước API dành cho FE

- Base URL: `http://127.0.0.1:3000/api/v1`.
- Response thành công: `{ "data": ... }`.
- Response lỗi: `{ "error": { "code", "message", "details"?, "requestId" } }`.
- Mọi POST cần `Content-Type: application/json` và JSON body. Logout gửi `{}`.
- Giới hạn JSON body: 64 KB. Trường không nằm trong contract bị từ chối.
- Ngày giờ dùng ISO 8601 UTC; thời lượng dùng millisecond.
- Chế độ gửi qua API là `classic` hoặc `hunt`; tên hiển thị có thể là “The Hunt”.
- User ID luôn lấy từ phiên đăng nhập; FE không gửi `userId` để lưu điểm.
- Gửi `credentials: 'include'` trong fetch. Backend đặt cookie `snake_session` có `HttpOnly`; FE không đọc token bằng JavaScript và không cần lưu token vào localStorage.
- Đăng ký không tự đăng nhập. Đăng ký thành công thì gọi API đăng nhập.

Ví dụ gọi từ FE, chỉ là đoạn hướng dẫn tích hợp:

```javascript
const API_BASE = 'http://127.0.0.1:3000/api/v1';

async function callApi(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error.message);
    error.code = payload.error.code;
    error.details = payload.error.details;
    error.requestId = payload.error.requestId;
    throw error;
  }
  return payload.data;
}

await callApi('/auth/login', {
  method: 'POST',
  body: { username: 'Player_One', password: 'your-password' },
});
const session = await callApi('/auth/me');
await callApi('/auth/logout', { method: 'POST', body: {} });
```

## Danh sách endpoint

Các đường dẫn dưới đây nằm sau `/api/v1`:

| Method | Endpoint | Đăng nhập | Thành công |
| --- | --- | --- | --- |
| GET | `/health` | Không | 200, trạng thái server và loại lưu trữ |
| GET | `/game-config` | Không | 200, luật và trạng thái cấu hình điểm |
| POST | `/auth/register` | Không | 201, tài khoản mới |
| POST | `/auth/login` | Không | 200, thông tin tài khoản, hạn phiên và Set-Cookie |
| GET | `/auth/me` | Có | 200, tài khoản và hạn phiên |
| POST | `/auth/logout` | Có | 200, xóa phiên và cookie |
| POST | `/scores` | Có | 201 khi lưu mới, 200 khi gửi lại cùng kết quả |
| GET | `/me/records` | Có | 200, kỷ lục từng chế độ |
| GET | `/me/scores` | Có | 200, lịch sử phân trang |
| GET | `/leaderboard` | Không | 200, bảng xếp hạng theo chế độ |

### Tài khoản

Đăng ký: `{ "username": "Player_One", "password": "your-password", "confirmPassword": "your-password" }`.

Username dùng 3–30 ký tự ASCII gồm chữ, số và `_`; phân biệt tên hiển thị nhưng không phân biệt hoa/thường khi tìm tài khoản. Password mới dài 8–128 ký tự, không tự trim. Password được hash bằng scrypt với salt ngẫu nhiên, không trả về qua API.

Đăng ký trả `{ "data": { "user": { "id", "username", "createdAt" } } }`. Đăng nhập và `/auth/me` trả `{ "data": { "user": { "id", "username", "createdAt" }, "expiresAt" } }`. Logout trả `{ "data": { "loggedOut": true } }`. Phiên đã hết hạn hoặc đã logout trả 401.

### Cấu hình game

`GET /game-config` hiện trả:

```json
{
  "data": {
    "version": "draft-v1",
    "classic": { "pointsPerFood": null },
    "hunt": {
      "snakeLengthPolicy": "fixed",
      "completionCondition": "all_prey_caught_then_enter_portal",
      "timeGraceSeconds": 60,
      "timePenaltyRounding": "whole_seconds",
      "timeScoreFloor": null,
      "newPreyRatio": null,
      "preyCatalog": [],
      "levels": []
    },
    "scoringConfigured": { "classic": false, "hunt": false }
  }
}
```

FE giữ `version` từ lúc bắt đầu lượt chơi và gửi lại bằng `rulesVersion` khi lưu. Nếu `scoringConfigured[mode]` là false, có thể hiển thị “Điểm số chưa được cấu hình” và vô hiệu hóa nút lưu thành tích của chế độ đó. Backend vẫn kiểm tra trạng thái này.

### Lưu thành tích Classic

```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "classic",
  "rulesVersion": "draft-v1",
  "foodEaten": 12,
  "activeDurationMs": 85000,
  "endReason": "collision"
}
```

`runId` là UUID mới cho mỗi lượt, FE có thể tạo bằng `crypto.randomUUID()`. Chơi lại thì tạo UUID mới; gửi lại do lỗi mạng thì giữ UUID và toàn bộ kết quả cũ. Các số lượng và thời lượng là số nguyên không âm. `endReason` Classic: `collision`, `board_filled`, `quit`.

Khi hệ số đã chốt, backend tính `foodEaten × pointsPerFood`; không nhận tổng điểm do FE tự khai. Hiện tại request hợp lệ trả 409 vì hệ số chưa cấu hình.

### Lưu thành tích The Hunt

Contract minh họa dưới đây dùng mã màn và mã mồi tượng trưng, **không tạo màn chơi hay hệ số mặc định**:

```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440001",
  "mode": "hunt",
  "rulesVersion": "draft-v1",
  "activeDurationMs": 100000,
  "endReason": "collision",
  "levelResults": [
    {
      "levelId": "configured-level-id",
      "activeDurationMs": 75000,
      "enteredPortal": true,
      "preyCaught": { "old-prey-id": 2, "featured-prey-id": 8 }
    }
  ]
}
```

Luật đã xác định:

1. Rắn không tăng chiều dài trong The Hunt.
2. Mỗi màn có loài mồi đặc trưng và danh sách số lượng/loại mồi thiết kế trước. Tỷ lệ chính thức chưa chốt.
3. Ăn hết mồi chỉ mở cổng. Chỉ khi đi vào cổng mới kết thúc màn và dừng thời gian.
4. `levelResults` chỉ chứa các màn **đã ăn hết mồi và đã vào cổng**, theo đúng thứ tự cấu hình, không lặp hoặc bỏ qua màn. Màn đang dở không đóng góp điểm vào tổng lưu.
5. `preyCaught` phải khớp chính xác danh sách và số lượng mồi của màn.
6. `activeDurationMs` của mỗi màn tính từ bắt đầu màn đến vào cổng, **bao gồm thời gian tìm đường tới cổng**, không tính thời gian pause, màn giới thiệu hoặc màn kết quả.
7. Thời lượng cả lượt phải lớn hơn hoặc bằng tổng thời lượng các màn hoàn thành; có thể bao gồm thời gian chơi của màn cuối đang dở.
8. 60 giây đầu giữ nguyên điểm thời gian. Sau đó trừ điểm theo thời gian; vượt mốc 60 giây không tự gây Game Over.
9. Quy ước hiện tại: trừ theo mỗi giây hoàn chỉnh vượt 60 giây. Nếu muốn trừ ngay ở giây lẻ, cần đổi luật này trước khi FE tích hợp.
10. Điểm thời gian dừng ở 0 hay tiếp tục âm vẫn chưa chốt. `timeScoreFloor` giữ `null`; khi được xác nhận sẽ đặt `0` hoặc `"unbounded"`.

Công thức khi đã cấu hình:

```text
foodScore = sum(preyCount[type] * preyPoints[type])
penaltySeconds = floor(max(0, activeDurationMs - 60000) / 1000)
rawTimeScore = timeBonusMax - penaltySeconds * timePenaltyPerSecond
timeScore = max(0, rawTimeScore) if floor policy is 0; otherwise rawTimeScore
levelScore = foodScore + timeScore
runScore = sum(score of each completed level)
```

`endReason` Hunt: `collision`, `completed`, `quit`. `completed` nghĩa là đã qua cổng của **mọi màn hiện có trong cấu hình**. Backend không chấp nhận kết quả chứa tất cả màn nhưng khai kết thúc bằng collision/quit.

Không gửi `score`, `userId`, `foodScore` hoặc `timeScore` trong request. Backend tự tính điểm từ cấu hình và kết quả gửi lên. Việc kiểm tra này **chưa chứng minh lượt chơi là thật**: backend chưa chạy lại lịch sử thao tác hoặc mô phỏng gameplay để chống sửa số liệu client.

Sau khi được cấu hình, phản hồi lưu thành tích có dạng:

```text
data: {
  saved: true,
  duplicate: false,
  isNewRecord: true,
  personalBest: <calculated score>,
  run: {
    id, runId, mode, rulesVersion, activeDurationMs, endReason,
    foodEaten?, score, scoreBreakdown: { foodScore, timeScore },
    levelResults: [{ levelId, activeDurationMs, enteredPortal, preyCaught, foodScore, timeScore, score }],
    createdAt
  }
}
```

Gửi lại cùng UUID và kết quả: 200, `duplicate: true`, giữ nguyên lượt đã lưu. Cùng UUID nhưng đổi kết quả: `409 RUN_ID_CONFLICT`. `isNewRecord` là false khi gửi lại, khi điểm thấp hơn hoặc bằng kỷ lục.

### Kỷ lục, lịch sử và bảng xếp hạng

`GET /me/records` trả:

```json
{ "data": { "classic": null, "hunt": null } }
```

Nếu có kỷ lục, giá trị tương ứng là `{ "mode", "score", "runId", "achievedAt" }`.

`GET /me/scores?mode=hunt&page=1&pageSize=20`: `mode` có thể bỏ để xem cả hai chế độ. `page` mặc định 1, `pageSize` mặc định 20 và tối đa 100. Response:

```json
{
  "data": {
    "items": [],
    "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
  }
}
```

Lịch sử chỉ thuộc tài khoản đang đăng nhập, sắp xếp mới nhất trước. Mỗi item có cấu trúc `run` như phản hồi lưu thành tích.

`GET /leaderboard?mode=classic&limit=10`: `mode` bắt buộc; `limit` mặc định 10, từ 1–100. Response:

```json
{ "data": { "mode": "classic", "items": [] } }
```

Mỗi item có `{ "rank", "username", "score", "achievedAt" }`. Mỗi người xuất hiện một lần trong từng chế độ. Điểm giảm dần; bằng điểm thì ưu tiên kỷ lục đạt trước; nếu cùng thời điểm dùng user ID để ổn định thứ tự. `rank` là vị trí liên tiếp 1, 2, 3.

### Các lỗi FE cần xử lý

| HTTP | Code | Cách xử lý |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Hiển thị lỗi trường từ `details` |
| 400 | `INVALID_JSON` | Kiểm tra JSON body |
| 401 | `INVALID_CREDENTIALS` | Báo thông tin đăng nhập không đúng |
| 401 | `UNAUTHENTICATED` | Chuyển về guest hoặc yêu cầu đăng nhập |
| 403 | `ORIGIN_NOT_ALLOWED` | Kiểm tra origin FE và cấu hình backend |
| 404 | `NOT_FOUND` | Kiểm tra endpoint |
| 409 | `USERNAME_TAKEN` | Yêu cầu chọn username khác |
| 409 | `SCORING_NOT_CONFIGURED` | Hệ số/màn chưa chốt, không báo lưu điểm thành công |
| 409 | `RULES_VERSION_MISMATCH` | Tải cấu hình mới trước lượt chơi mới; không gán phiên bản mới vào kết quả cũ |
| 409 | `RUN_ID_CONFLICT` | Giữ nguyên nội dung khi retry; lượt mới phải có UUID mới |
| 413 | `PAYLOAD_TOO_LARGE` | Giảm kích thước request dưới 64 KB |
| 415 | `JSON_REQUIRED` / `UNSUPPORTED_ENCODING` | Gửi UTF-8 JSON với Content-Type phù hợp |
| 429 | `RATE_LIMITED` | Chờ số giây trong header `Retry-After` |
| 500 | `INTERNAL_ERROR` | Ghi nhận `requestId` để đối chiếu lỗi backend |

Ví dụ lỗi:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "confirmPassword", "message": "Must match password." }],
    "requestId": "generated-request-id"
  }
}
```

## Kiểm thử

`pnpm test` chạy kiểm thử HTTP và nghiệp vụ: tài khoản, cookie, hết hạn phiên, logout, CORS, JSON lỗi, rate limit, phân quyền dữ liệu, lưu trùng, kỷ lục, xếp hạng và The Hunt. Kiểm thử chạy với repository trong bộ nhớ và thời gian có thể điều khiển, không cần database.

`pnpm check` kiểm tra cú pháp toàn bộ JavaScript trong source, test và scripts.

## Những quyết định còn chờ

- Hệ số điểm Classic và điểm từng loại mồi của The Hunt.
- Số màn, loài mồi, số lượng từng loại, tỷ lệ mồi mới/cũ và hành vi cụ thể.
- Điểm thời gian tối đa, mức trừ mỗi giây của từng màn và có cho phép điểm âm hay không.
- Xác nhận quy ước giây hoàn chỉnh, và chỉ cộng điểm các màn đã qua cổng khi lượt chơi kết thúc giữa chừng.
- Adapter database do phần phụ trách database thực hiện. Backend hiện không có dependency MySQL hoặc mã SQL.

## Tài liệu kỹ thuật tham khảo

- [Express API](https://expressjs.com/en/5x/api/)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [pnpm settings](https://pnpm.io/settings)
