import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  action?: ReactNode;
};

export function AuthField({ id, label, className, action, ...props }: AuthFieldProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-[16px] font-extrabold text-[#111318]">{label}</span>
      <span className="relative block">
        <input
          id={id}
          className={cn(
            "h-[56px] w-full rounded-lg border border-[#d6dde7] bg-white px-5 text-[17px] font-medium text-[#172033] outline-none transition placeholder:text-[#8794a8] focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10",
            action && "pr-14",
            className,
          )}
          {...props}
        />
        {action}
      </span>
    </label>
  );
}

type AuthPasswordFieldProps = Omit<AuthFieldProps, "type" | "action">;

export function AuthPasswordField(props: AuthPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AuthField
      type={isVisible ? "text" : "password"}
      action={
        <button
          id={`${props.id}-visibility-toggle`}
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-[#24314a] transition hover:text-[#00951d]"
          aria-label={isVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
          aria-pressed={isVisible}
        >
          {isVisible ? <Eye className="h-6 w-6" strokeWidth={2.2} /> : <EyeOff className="h-6 w-6" strokeWidth={2.2} />}
        </button>
      }
      {...props}
    />
  );
}
