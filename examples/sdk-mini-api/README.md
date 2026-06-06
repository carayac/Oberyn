# Oberyn SDK Mini API

Mini proyecto para probar el SDK contra el backend real de Oberyn.

## Configuración

Desde `examples/sdk-mini-api`:

```powershell
npm install
Copy-Item .env.example .env
```

Edita `.env` y define al menos la clave pública real del proyecto:

```env
OBERYN_SDK_KEY=
OBERYN_SDK_ENDPOINT=http://localhost:4000/api/sdk/events
```

La clave `OBERYN_SDK_KEY` debe ser la clave pública real del proyecto en Oberyn. Este mini proyecto ya no incluye claves por defecto.

## PayGuard

Primero arranca el backend desde la raíz:

```powershell
npm run dev:backend
```

Para agregar un agente de pago y una wallet real al proyecto, completa:

```env
OBERYN_PAYGUARD_AGENT_NAME=
OBERYN_PAYGUARD_AGENT_MAX_AMOUNT=
OBERYN_PAYGUARD_RECIPIENT_NAME=
OBERYN_PAYGUARD_RECIPIENT_WALLET=
OBERYN_PAYGUARD_TOKEN=
```

Luego crea o actualiza esas filas reales en Supabase:

```powershell
cd examples/sdk-mini-api
npm run payguard:setup
```

Después lee la configuración PayGuard real del proyecto conectado:

```powershell
npm run payguard:config
```

Ese comando imprime los agentes PayGuard que pueden crear solicitudes y las wallets verificadas del proyecto. Para crear una solicitud real, llena en `.env`:

```env
OBERYN_PAYGUARD_AMOUNT=
OBERYN_PAYGUARD_REASON=
```

`OBERYN_PAYGUARD_AGENT_ID` y `OBERYN_PAYGUARD_RECIPIENT_WALLET` son opcionales si el proyecto ya tiene al menos un agente real y una wallet verificada real. El script toma el primer registro real que devuelve `oberyn.payguard.config()`.

Ejecuta:

```powershell
npm run payguard:test
```

El script llama a:

```txt
oberyn.payguard.config()
oberyn.payguard.requestPayment()
```

No selecciona agentes o wallets inventadas, no usa una clave SDK fija y no crea escrow. La solicitud queda en el dashboard del proyecto para aprobar, rechazar o bloquear. Las acciones de escrow, fondeo y liberación solo funcionan si Trustless Work está configurado en `live`.

## Demo completo

`npm start` ejecuta el demo amplio del SDK. PayGuard queda desactivado por defecto para evitar crear solicitudes reales sin querer.

Para incluir PayGuard en `npm start`, define:

```env
OBERYN_RUN_PAYGUARD_DEMO=1
OBERYN_PAYGUARD_AGENT_ID=
OBERYN_PAYGUARD_RECIPIENT_WALLET=
OBERYN_PAYGUARD_AMOUNT=
OBERYN_PAYGUARD_REASON=
```

DeepSeek solo se ejecuta si defines `DEEPSEEK_API_KEY`.
