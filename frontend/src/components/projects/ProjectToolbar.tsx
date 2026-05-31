import { Filter, Search } from "lucide-react";
import { projectTypeLabels, statusLabels } from "./projectLabels";

type ProjectToolbarProps = {
  search: string;
  statusFilter: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
};

export function ProjectToolbar({ search, statusFilter, typeFilter, onSearchChange, onStatusFilterChange, onTypeFilterChange }: ProjectToolbarProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4 xl:flex-row">
      <label className="relative min-w-0 flex-1" htmlFor="projects-search">
        <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#4b5565]" strokeWidth={2} />
        <input
          id="projects-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar proyectos..."
          className="h-12 w-full rounded-lg border border-[#dce2ea] bg-white pl-14 pr-5 text-[16px] font-medium text-[#111827] outline-none transition placeholder:text-[#8794a8] focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10 sm:h-14 sm:text-[17px]"
        />
      </label>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[430px]">
        <label className="relative" htmlFor="projects-status-filter">
          <Filter className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4b5565]" />
          <select
            id="projects-status-filter"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="h-12 w-full appearance-none rounded-lg border border-[#dce2ea] bg-white pl-12 pr-4 text-[15px] font-semibold text-[#111827] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10 sm:h-14 sm:text-[16px]"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <select
          id="projects-type-filter"
          value={typeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value)}
          className="h-12 min-w-0 rounded-lg border border-[#dce2ea] bg-white px-4 text-[15px] font-semibold text-[#111827] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10 sm:h-14 sm:text-[16px]"
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(projectTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
