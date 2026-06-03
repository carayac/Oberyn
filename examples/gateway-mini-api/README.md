# Oberyn Gateway Mini API Demo

Mini proyecto para probar Oberyn Gateway contra DeepSeek.

## What It Does

- Sends one clean DeepSeek chat request through Oberyn Gateway.
- Sends one malicious prompt that should be blocked by Gateway prompt inspection before reaching DeepSeek.
- Prints Gateway decision headers, risk level, status code, and provider response/error.

## Run

From the repository root:

```powershell
npm --prefix backend run build
npm run dev:backend
```

In another terminal:

```powershell
cd examples/gateway-mini-api
npm start
```

The demo uses this Gateway token by default:

```txt
gw_1b50cd51-477f-44af-b3d2-6daaa67b76e3_c89d9e85df0ca2fce4ed3322
```

Add your provider key to `examples/.env` or `examples/gateway-mini-api/.env`:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
OBERYN_GATEWAY_TOKEN=gw_1b50cd51-477f-44af-b3d2-6daaa67b76e3_c89d9e85df0ca2fce4ed3322
OBERYN_GATEWAY_UPSTREAM_BASE_URL=https://api.deepseek.com
```

`OBERYN_PROJECT_ID` is optional when the token has the format `gw_<projectId>_<signature>`. Do not use an SDK key (`ob_pk_...`) as `OBERYN_PROJECT_ID`; Gateway routes need the project UUID. If the demo sees `OBERYN_PROJECT_ID=ob_pk_...`, it ignores it and uses the project id embedded in the Gateway token.

## Expected Output

The clean request should return `200` with:

```txt
Oberyn decision: approved
Provider content: oberyn-gateway-...
```

The malicious request should return `422` with:

```txt
Oberyn decision: blocked
Oberyn risk: critical
```
