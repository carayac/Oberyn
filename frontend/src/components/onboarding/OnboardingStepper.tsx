import { Stepper } from "../ui/Stepper";
export function OnboardingStepper({ current = 0 }: { current?: number }) {
  return <Stepper current={current} steps={["Organización", "Proyecto", "Conexión", "Reglas", "Resumen"]} />;
}

