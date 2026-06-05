# Oberyn SDK Technical Guide

Last updated: 2026-06-03

## Proposito

El SDK de Oberyn protege prompts, tool calls y llamadas a APIs externas desde el codigo del cliente. La aplicacion del usuario conserva sus credenciales privadas; Oberyn recibe contexto operativo, calcula riesgo, evalua reglas del proyecto, decide si una accion puede ejecutarse y registra auditoria.

La regla de producto es esta:

```txt
El usuario describe lo que intenta hacer.
Oberyn decide riesgo, decision, servicio detectado, flujo y auditoria.
```

Por eso el uso recomendado no pide `decision`, `riskLevel` ni `service` en cada evento. Esos campos siguen existiendo como overrides avanzados, pero no son necesarios para integrar una aplicacion real.

## Endpoints runtime

```txt
POST /api/sdk/evaluate
POST /api/sdk/audit
POST /api/sdk/events
POST /api/sdk/events/batch
POST /api/sdk/heartbeat
POST /api/sdk/approval-status
POST /api/sdk/payguard/config
POST /api/sdk/payguard/payment-requests
```

La autenticacion usa la clave publica del proyecto en `x-oberyn-key`. Esta clave solo puede enviar eventos SDK, evaluar acciones y consultar aprobaciones asociadas al proyecto. No es una clave de administrador y no debe confundirse con tokens de proveedores.

## Instalacion

```bash
npm i oberyn
```

El SDK se consume como paquete npm. Instala `oberyn` desde npm y úsalo directamente en tu aplicacion.

## Inicializacion

```ts
import { createOberyn } from "oberyn";

export const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY!,
  endpoint: "http://localhost:4000/api/sdk/events",
  environment: "production",
  service: {
    name: "support-api",
    provider: "custom",
    type: "backend"
  },
  failMode: "closed",
  approvalMode: "throw",
  captureFetch: false
});
```

`service` en la configuracion es el servicio principal de la aplicacion. Para llamadas HTTP externas, el SDK puede detectar el proveedor desde la URL. Por ejemplo, `https://api.deepseek.com/...` se clasifica como proveedor `deepseek`.

## Variables de entorno

Configuracion minima:

```env
OBERYN_SDK_KEY=ob_pk_tu_clave_publica_del_proyecto
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
OBERYN_APPROVAL_MODE=throw
```

Configuracion para probar DeepSeek desde el mini proyecto:

```env
OBERYN_SDK_KEY=ob_pk_tu_clave_publica_del_proyecto
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
OBERYN_APPROVAL_MODE=throw
OBERYN_RUN_APPROVAL_DEMO=0

DEEPSEEK_API_KEY=tu_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_PROMPT=Explica en una frase que hace Oberyn SDK.
```

Configuracion para validar aprobacion humana con DeepSeek:

```env
OBERYN_SDK_KEY=ob_pk_tu_clave_publica_del_proyecto
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
OBERYN_APPROVAL_MODE=poll
OBERYN_RUN_APPROVAL_DEMO=1

DEEPSEEK_API_KEY=tu_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_APPROVAL_PROMPT=Responde exactamente: accion aprobada por humano en Oberyn.
```

Variables disponibles:

- `OBERYN_SDK_KEY`: clave publica del proyecto. Se copia desde la pagina SDK del proyecto.
- `OBERYN_SDK_ENDPOINT`: endpoint runtime de Oberyn. En desarrollo puede ser `http://localhost:4000/api/sdk/events`; en produccion usa tu dominio de API.
- `OBERYN_APPROVAL_MODE`: `throw` lanza error cuando se requiere aprobacion; `poll` espera hasta que el humano apruebe o rechace.
- `OBERYN_RUN_APPROVAL_DEMO`: `1` activa el escenario del mini proyecto que espera aprobacion humana antes de llamar a DeepSeek.
- `OBERYN_RUN_PAYGUARD_DEMO`: `1` crea una solicitud PayGuard desde el mini proyecto; `0` la omite.
- `OBERYN_PAYGUARD_AGENT_ID`: opcional; si falta, el demo usa el primer agente PayGuard activo del proyecto.
- `OBERYN_PAYGUARD_RECIPIENT_WALLET`: opcional; si falta, el demo usa la primera wallet verificada del proyecto.
- `OBERYN_PAYGUARD_AMOUNT`: monto de prueba para la solicitud PayGuard.
- `DEEPSEEK_API_KEY`: clave privada del proveedor. Se queda en tu aplicacion; Oberyn no la necesita.
- `DEEPSEEK_MODEL`: modelo DeepSeek, por ejemplo `deepseek-chat`.
- `DEEPSEEK_PROMPT`: prompt configurable para el demo normal.
- `DEEPSEEK_APPROVAL_PROMPT`: prompt que se usa en la prueba de aprobacion humana.

No uses `OBERYN_GATEWAY_TOKEN` para el SDK. El Gateway es una implementacion futura y no debe mezclarse con los endpoints runtime del SDK.

## Perfiles de configuracion

Modo estricto para produccion:

```ts
const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY!,
  endpoint: process.env.OBERYN_SDK_ENDPOINT!,
  environment: "production",
  failMode: "closed",
  approvalMode: "throw",
  captureFetch: false
});
```

Modo con espera de aprobacion humana:

```ts
const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY!,
  endpoint: process.env.OBERYN_SDK_ENDPOINT!,
  approvalMode: "poll",
  approvalPollIntervalMs: 2500,
  approvalTimeoutMs: 120000
});
```

Modo observabilidad durante desarrollo:

```ts
const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY!,
  endpoint: process.env.OBERYN_SDK_ENDPOINT!,
  environment: "development",
  captureFetch: true,
  failMode: "open"
});
```

## Que define el usuario

El usuario debe aportar contexto que Oberyn no puede adivinar con certeza:

- `actionName`: nombre estable de la accion o flujo, por ejemplo `billing.refund.create`.
- `prompt`: texto que se va a enviar a un modelo.
- `url`, `method` y `body`: en llamadas HTTP protegidas.
- `actor`, `resource`, `permissions`: contexto opcional de quien ejecuta la accion.
- `metadata`: IDs internos, modulo, sesion, runId o informacion no sensible.

## Que define Oberyn

Oberyn calcula automaticamente:

- `eventType`: `http_request`, `llm_call`, `tool_call`, `application_event` o `sdk_event`.
- `service`: proveedor, nombre, tipo y metodo de conexion.
- `riskLevel`: `low`, `medium`, `high` o `critical`.
- `decision`: `approved`, `blocked` o `requires_approval`.
- `flow`: se crea o actualiza usando `actionName`.
- `integration`: se crea o actualiza usando proveedor y servicio.
- `audit`: hash, metadata redactada, decision aplicada y evidencia.

La decision final de una accion protegida viene del backend de Oberyn mediante `/api/sdk/evaluate`. El SDK tambien tiene inferencia local para enriquecer eventos pasivos, detectar riesgo inicial y proteger prompts antes de llamar al proveedor.

## Inferencia automatica

El SDK clasifica riesgo con reglas locales conservadoras antes de consultar el backend:

- `GET`, `read`, `lookup`, `list`, `search`: riesgo bajo.
- `POST`, `PUT`, `PATCH`, `create`, `update`, `publish`: riesgo medio.
- `refund`, `payment`, `transfer`, `export`, `send_email`: riesgo alto.
- `delete`, `drop`, `admin`, `permission`, `secret`, `token`, `password`, `api_key`: riesgo critico.
- Payloads con secretos, tokens, cookies, autorizaciones o datos sensibles: riesgo critico.
- Montos altos en campos como `amount`, `total`, `paymentAmount` o `refundAmount`: riesgo alto o critico.
- Prompts con jailbreak, instrucciones de bypass o exfiltracion: riesgo alto o critico.

Estas inferencias se envian al backend, donde las reglas del proyecto pueden aprobar, bloquear o solicitar aprobacion humana.

## Llamadas HTTP protegidas

Esta es la forma recomendada para APIs externas. No se pasa `decision`, `riskLevel` ni `service`.

```ts
const post = await oberyn.api.request(
  "https://jsonplaceholder.typicode.com/posts/1",
  { method: "GET" },
  {
    actionName: "jsonplaceholder.posts.read",
    metadata: { postId: 1 }
  }
);
```

Para una escritura:

```ts
const created = await oberyn.api.request(
  "https://jsonplaceholder.typicode.com/posts",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Oberyn SDK demo",
      body: "Created through a protected SDK flow",
      userId: 1
    })
  },
  {
    actionName: "jsonplaceholder.posts.create",
    metadata: { intent: "demo_post_creation" }
  }
);
```

Flujo interno de `oberyn.api.request`:

1. Infiere proveedor desde URL.
2. Infiere tipo de evento y riesgo.
3. Llama `/api/sdk/evaluate`.
4. Si Oberyn bloquea, no ejecuta el fetch.
5. Si requiere aprobacion, lanza `OberynApprovalRequiredError` o espera si `approvalMode` es `poll`.
6. Ejecuta la llamada real.
7. Registra `/api/sdk/audit` con status, duracion y resultado.
8. Devuelve la respuesta parseada.

Si necesitas el objeto `Response` nativo:

```ts
const response = await oberyn.api.fetch(url, init, {
  actionName: "external.raw_response",
  protect: true
});
```

## Proteccion de prompts

```ts
const answer = await oberyn.shield.protect(
  {
    prompt: userInput,
    provider: "deepseek",
    model: "deepseek-chat",
    sessionId
  },
  async (safePrompt) => {
    return oberyn.api.request(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: safePrompt }]
        })
      },
      { actionName: "deepseek.chat.completions.create" }
    );
  }
);
```

`shield.protect` hace:

- Enmascara emails, telefonos, numeros largos, API keys, tokens, passwords y secrets.
- Calcula score local de riesgo del prompt.
- Llama a `/api/sdk/evaluate`.
- Lanza error si Oberyn bloquea o requiere aprobacion.
- Entrega `safePrompt` al callback si la accion fue aprobada.
- Registra el resultado con `/api/sdk/audit`.

## Tool calls y acciones criticas

`proof.guard` protege una accion antes de ejecutar la funcion. El usuario describe el tool call; Oberyn calcula riesgo y decision.

```ts
import { OberynApprovalRequiredError, OberynBlockedError } from "oberyn";

try {
  const refund = await oberyn.proof.guard(
    {
      name: "billing.refund.create",
      category: "payments",
      target: "stripe",
      arguments: { paymentIntentId, amount },
      actor: { id: user.id, role: user.role },
      resource: { type: "payment", id: paymentIntentId }
    },
    async () => stripe.refunds.create({ payment_intent: paymentIntentId, amount })
  );
} catch (error) {
  if (error instanceof OberynBlockedError) {
    console.error("Bloqueado por Oberyn:", error.decision.reason);
  }

  if (error instanceof OberynApprovalRequiredError) {
    console.error("Aprobacion requerida:", error.decision.approvalId);
  }
}
```

El callback solo se ejecuta si Oberyn devuelve `approved` o si la aprobacion humana se resuelve cuando `approvalMode: "poll"` esta activo.

## Solicitudes de pago con PayGuard

El SDK tambien puede crear solicitudes de pago para PayGuard. Esta API esta pensada para agentes de IA: el agente propone el pago, pero no recibe metodos para crear escrow, fondear ni liberar fondos.

```ts
const payguard = await oberyn.payguard.config();
const agent = payguard.agents.find((item) => item.status === "active");
const wallet = payguard.trustedWallets[0];

const paymentRequest = await oberyn.payguard.requestPayment({
  agentId: agent!.id,
  recipientName: wallet!.recipientName,
  recipientWallet: wallet!.walletAddress,
  amount: 250,
  token: "USDC",
  reason: "Factura aprobada por orden de compra #1842",
  riskLevel: "medium"
});

console.log(paymentRequest.status);
console.log(paymentRequest.auditHash);
```

El backend evalua la solicitud con el policy engine de PayGuard:

1. Agente bloqueado o sin permiso para crear solicitudes: `blocked`.
2. Wallet no verificada: `blocked`.
3. Pago hasta 1000 USDC: `pending_approval`.
4. Pago mayor a 1000 USDC: `requires_multi_approval`.
5. Se registra auditoria y `auditHash`.

Despues de eso, el flujo continua en el dashboard:

```txt
Proyecto > PayGuard
```

Solo un humano autenticado puede aprobar, rechazar o bloquear. Solo una solicitud aprobada puede crear escrow en Trustless Work. El SDK no expone metodos para ejecutar pagos directamente.

## Aprobacion humana y ejecucion posterior

Cuando `approvalMode` es `poll`, el SDK no ejecuta el callback protegido inmediatamente si Oberyn devuelve `requires_approval`. En su lugar:

1. Crea o recibe una solicitud de aprobacion en el backend.
2. Consulta `/api/sdk/approval-status` cada `approvalPollIntervalMs`.
3. Si el humano aprueba, ejecuta el callback.
4. Si el humano rechaza, lanza `OberynBlockedError`.
5. Si vence `approvalTimeoutMs`, lanza `OberynApprovalRequiredError`.

Ejemplo con DeepSeek:

```ts
const result = await oberyn.proof.guard(
  {
    name: "deepseek.chat.human_approval_required",
    category: "llm",
    target: "deepseek",
    riskLevel: "high",
    arguments: {
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      promptPreview: prompt
    },
    actor: { id: "demo-user", role: "support_agent" },
    metadata: {
      flow: "deepseek_human_approval_demo",
      method: "POST",
      url: "https://api.deepseek.com/chat/completions"
    }
  },
  async () => {
    return callDeepSeek(prompt);
  }
);
```

Para que esta prueba cree una solicitud de aprobacion, el proyecto debe tener una regla activa que requiera aprobacion para riesgo alto, para el provider `deepseek`, para acciones `llm`, o para el `actionName` usado en el ejemplo. Si no existe una regla compatible, Oberyn puede aprobar la accion y el callback se ejecutara sin esperar.

Una regla recomendada:

```txt
Nombre: Requerir aprobacion para DeepSeek de alto riesgo
Categoria: approval
Severidad: high
Condicion: risk_level
Resultado: require_approval
Estado: activa
```

En el dashboard, la aprobacion aparecera en:

```txt
Proyecto > Aprobaciones
```

Al aprobarla, la terminal del mini proyecto debe mostrar que el SDK recibio aprobacion y recien entonces llamo al proveedor.

## Eventos de negocio automaticos

Para registrar un hito de la aplicacion, usa `record`. No declares decision, riesgo ni servicio.

```ts
await oberyn.record({
  actionName: "sdk_mini_api_demo.completed",
  metadata: {
    readPostId: post.id,
    createdPostId: created.id
  }
});
```

Oberyn lo clasificara como evento de aplicacion, riesgo bajo, decision aprobada y servicio de la aplicacion configurada.

Para eventos asincronos de bajo riesgo donde no necesitas esperar respuesta, usa `capture`:

```ts
oberyn.capture({
  actionName: "support.conversation.closed",
  metadata: { conversationId, durationMs }
});
```

`capture` encola el evento y lo manda por batch. `record` lo envia inmediatamente y devuelve el ID del evento.

## Seguimiento de funciones

`track` mide duracion y resultado de una funcion. Si la funcion falla, Oberyn registra el evento como fallo sin que el usuario tenga que pasar `decision`.

```ts
const report = await oberyn.track(
  "reports.daily.generate",
  () => generateDailyReport(),
  { metadata: { reportDate } }
);
```

## Captura automatica de fetch

Si inicializas con `captureFetch: true`, el SDK envuelve `globalThis.fetch` y registra llamadas HTTP automaticamente.

```ts
const oberyn = createOberyn({
  apiKey: process.env.OBERYN_SDK_KEY!,
  captureFetch: true
});
```

Esto es util para descubrimiento y observabilidad. Para proteger antes de ejecutar, prefiere `oberyn.api.request` o `oberyn.api.fetch`, porque esos metodos consultan `/api/sdk/evaluate` antes de hacer la llamada real.

## Errores del SDK

```ts
import { OberynBlockedError, OberynApprovalRequiredError } from "oberyn";
```

- `OberynBlockedError`: la accion no debe ejecutarse.
- `OberynApprovalRequiredError`: Oberyn creo o requiere una aprobacion humana.
- Errores de red/backend: si `failMode` es `closed`, el SDK no ejecuta la accion protegida. Si `failMode` es `open`, ejecuta la accion y registra el fallo de evaluacion como metadata.

## Seguridad

- Nunca envies API keys de proveedores en `metadata` o `payload`.
- `oberyn.api.request` no copia headers de autorizacion al payload auditado.
- El SDK redacta claves comunes: `authorization`, `cookie`, `password`, `secret`, `token`, `apikey`, `api_key`, `key`.
- Los prompts pasan por masking local antes de llegar al backend.
- La clave `ob_pk_...` identifica el proyecto; no es una clave privada de proveedor.
- Los dashboards administrativos siguen usando Clerk; los endpoints runtime usan `x-oberyn-key`.

## Mini proyecto de ejemplo

Configura `examples/.env`:

```txt
OBERYN_SDK_KEY=ob_pk_...
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
OBERYN_APPROVAL_MODE=throw
OBERYN_RUN_APPROVAL_DEMO=0
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-chat
```

Instala dependencias:

```bash
cd examples/sdk-mini-api
npm install
```

Ejecuta el demo:

```bash
npm start
```

El demo prueba:

- Inspeccion de prompt.
- Llamada segura a DeepSeek.
- Prompt malicioso detenido antes del proveedor.
- GET protegido a JSONPlaceholder.
- POST protegido a JSONPlaceholder.
- Registro automatico de finalizacion del mini proyecto con `record`.

Para agregar el escenario de aprobacion humana antes del resto de pruebas:

```txt
OBERYN_APPROVAL_MODE=poll
OBERYN_RUN_APPROVAL_DEMO=1
```

Despues ejecuta:

```bash
node examples/sdk-mini-api/index.mjs
```

La terminal queda esperando. Aprueba la solicitud desde `Proyecto > Aprobaciones`. Si todo esta correcto, DeepSeek se invoca despues de la aprobacion, no antes. Luego el mini proyecto continua con inspeccion de prompt, DeepSeek protegido, prompt malicioso, JSONPlaceholder y registro final.

## Checklist de prueba

1. Backend activo en `http://localhost:4000`.
2. Frontend activo en `http://localhost:5173`.
3. Proyecto creado y clave `ob_pk_...` copiada en `OBERYN_SDK_KEY`.
4. Regla activa de aprobacion para riesgo alto si quieres probar `approvalMode=poll`.
5. `DEEPSEEK_API_KEY` configurada si quieres llamadas reales al proveedor.
6. Ejecutar `npm install` dentro del proyecto que consume el SDK para instalar `oberyn` desde npm.
7. Ejecutar `npm start` dentro de `examples/sdk-mini-api`.
8. Revisar `Proyecto > Auditoria`, `Proyecto > Integraciones`, `Proyecto > Flujos` y `Proyecto > Aprobaciones`.

## Mantenimiento

Cada cambio que afecte inicializacion, inferencia, event shape, autenticacion, batching, captureFetch, evaluacion, aprobaciones, auditoria o ejemplos del SDK debe actualizar este documento en el mismo cambio.
