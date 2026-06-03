# Oberyn SDK Mini API Demo

Mini proyecto para probar el SDK contra una API externa usando `createOberyn`.

## What It Does

- Inspects a prompt with `oberyn.shield.inspect`.
- Optionally calls DeepSeek Chat Completions through `oberyn.shield.protect` and `oberyn.proof.guard`.
- Protects a `GET` request to JSONPlaceholder with `oberyn.proof.guard`.
- Protects a `POST` request with `proof.guard` and `dryRun`.
- Sends one manual completion event with `capture`.

## Run

From the repository root:

```powershell
npm run build
npm run dev:backend
```

In another terminal:

```powershell
cd examples/sdk-mini-api
npm start
```

The demo uses this SDK key by default:

```txt
ob_pk_9923d658b3c0a0494f35fefa093f0dfb47b1f9a99ad43961
```

You can override it:

```powershell
$env:OBERYN_SDK_KEY="ob_pk_..."
$env:OBERYN_SDK_ENDPOINT="http://localhost:4000/api/sdk/events"
npm start
```

## DeepSeek

To test a real DeepSeek API call, add this to `examples/.env` or `examples/sdk-mini-api/.env`:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

If `DEEPSEEK_API_KEY` is missing, the demo skips the DeepSeek call and continues with JSONPlaceholder.

The first prompt in the script intentionally contains `Ignore previous instructions` to test Oberyn prompt inspection. The DeepSeek call uses a separate clean prompt with a unique run id, so a successful response should include something like:

```txt
oberyn-deepseek-...
```

The demo also runs a malicious DeepSeek prompt test. That prompt is inspected by Oberyn and should be blocked before a provider request is made. If the backend rules do not block it yet, the demo applies a local Oberyn demo policy, records a blocked event, and still prevents the DeepSeek request.

If a project rule requires approval for medium/high risk actions, the POST action may stop with an approval message. Approve it in the dashboard or set rules to allow medium risk while testing.

