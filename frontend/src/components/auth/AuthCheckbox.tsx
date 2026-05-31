import type { ReactNode } from "react";

type AuthCheckboxProps = {
  id: string;
  name?: string;
  required?: boolean;
  children: ReactNode;
};

export function AuthCheckbox({ id, name, required, children }: AuthCheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-4 text-[17px] font-medium text-[#28354a]">
      <input
        id={id}
        name={name}
        type="checkbox"
        required={required}
        className="h-6 w-6 rounded border-[#9aa8ba] text-[#00951d] focus:ring-[#00951d]"
      />
      <span>{children}</span>
    </label>
  );
}
