# Oberyn SDK Mini API Demo

Mini proyecto para probar el SDK contra APIs externas con inferencia automatica de Oberyn.

## Que prueba

- `oberyn.shield.inspect` para revisar prompts.
- `oberyn.shield.protect` para detener prompts maliciosos antes de llamar al proveedor.
- `oberyn.api.request` para proteger llamadas HTTP sin pasar `decision`, `riskLevel` ni `service`.
- `oberyn.proof.guard` para proteger tool calls con contexto de accion.
- `oberyn.payguard.config` y `oberyn.payguard.requestPayment` para crear solicitudes de pago reales conectadas al dashboard.
- `oberyn.record` para registrar el cierre del demo sin datos quemados.
- Una pregunta real a DeepSeek y la respuesta textual que devuelve el modelo.

El usuario solo describe acciones, prompts, URLs y metadata util. Oberyn calcula riesgo, decision, servicio, flujo e integracion.

## Ejecutar

Desde la raiz del repositorio:

```powershell
npm run dev:backend
```

En otra terminal:

```powershell
cd examples/sdk-mini-api
npm install
npm start
```

El demo usa esta clave SDK por defecto:

```txt
ob_pk_9923d658b3c0a0494f35fefa093f0dfb47b1f9a99ad43961
```

Puedes sobrescribirla en `examples/.env`:

```env
OBERYN_SDK_KEY=ob_pk_...
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
```

## PayGuard

El demo crea una solicitud de pago PayGuard usando los agentes y wallets verificadas del proyecto real asociado a `OBERYN_SDK_KEY`.

Flujo:

```txt
examples/sdk-mini-api
  -> oberyn.payguard.config()
  -> oberyn.payguard.requestPayment()
  -> dashboard > Project > PayGuard
```

Variables opcionales en `examples/.env`:

```env
OBERYN_RUN_PAYGUARD_DEMO=1
OBERYN_PAYGUARD_AGENT_ID=
OBERYN_PAYGUARD_RECIPIENT_NAME=
OBERYN_PAYGUARD_RECIPIENT_WALLET=
OBERYN_PAYGUARD_AMOUNT=75
OBERYN_PAYGUARD_TOKEN=USDC
OBERYN_PAYGUARD_REASON=SDK PayGuard demo
OBERYN_PAYGUARD_RISK_LEVEL=medium
```

Si no defines `OBERYN_PAYGUARD_AGENT_ID` ni `OBERYN_PAYGUARD_RECIPIENT_WALLET`, el demo toma el primer agente activo y la primera wallet verificada del proyecto. Despues de ejecutar `npm start`, abre:

```txt
Proyecto > PayGuard
```

La solicitud debe aparecer como `pending_approval`, `requires_multi_approval` o `blocked`, segun las reglas. El SDK no crea escrow, no fondea y no libera pagos; esas acciones quedan en el dashboard despues de aprobacion humana.

Para saltar esta prueba:

```env
OBERYN_RUN_PAYGUARD_DEMO=0
```

## DeepSeek

Para probar DeepSeek real, agrega:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_PROMPT=Explica en una frase que hace Oberyn SDK.
```

Si `DEEPSEEK_API_KEY` falta, el demo omite esa llamada y continua con JSONPlaceholder.

El demo ejecuta dos pruebas:

- Prompt limpio: Oberyn inspecciona el prompt, protege la llamada y luego invoca DeepSeek.
- Prompt configurable: el demo imprime `Respuesta real de DeepSeek` con el texto devuelto por el proveedor.
- Prompt malicioso: Oberyn debe detenerlo antes de que llegue a DeepSeek, ya sea como bloqueo o aprobacion requerida segun reglas del proyecto.

## Eventos esperados

En el dashboard deberias ver:

- Flujos por `actionName`, como `deepseek.chat.completions.create` y `jsonplaceholder.posts.create`.
- Integraciones detectadas desde URLs y targets.
- Auditoria de decisiones y ejecuciones.
- Solicitud PayGuard creada desde SDK con `auditHash`.
- Riesgo calculado por Oberyn.
- Evento final `sdk_mini_api_demo.completed` registrado con `record`.

Si una regla requiere aprobacion para acciones de riesgo alto, el demo puede detenerse con `OberynApprovalRequiredError`. Aprueba la solicitud en el dashboard o ajusta reglas para pruebas locales.

## Validar ejecucion despues de aprobacion humana

Este modo agrega una prueba de aprobacion humana antes de ejecutar el resto del demo. Una accion marcada como `requires_approval` no llama a DeepSeek hasta que la apruebes en Oberyn; despues de aprobarla, el mini proyecto continua con todas las pruebas normales del SDK.

En `examples/.env` usa:

```env
OBERYN_APPROVAL_MODE=poll
OBERYN_RUN_APPROVAL_DEMO=1
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

Ejecuta:

```powershell
cd examples/sdk-mini-api
npm start
```

La terminal mostrara un `Run ID` y quedara esperando. En el frontend abre:

```txt
Proyecto > Aprobaciones
```

Aprueba la solicitud `deepseek.chat.human_approval_required`. Despues de aprobarla, el SDK recibira el estado `approved`, ejecutara la funcion protegida, llamara a DeepSeek y seguira con el resto de pruebas. La terminal debe imprimir:

```txt
Human approval received by SDK. Calling DeepSeek now...
DeepSeek result after human approval
Human approval demo completed. Continuing with the full SDK test suite...
```

Eso valida el flujo completo: evaluacion, solicitud humana, polling del SDK, aprobacion y ejecucion real del proveedor.
