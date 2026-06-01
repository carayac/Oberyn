import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api/client";
import type { CreateOrganizationInput, Organization } from "../types/organization";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const ACTIVE_ORGANIZATION_KEY = "oberyn.activeOrganizationId";

export function useOrganizations() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_ORGANIZATION_KEY));
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken() {
    if (!isLoaded || !isSignedIn) return null;
    return getToken();
  }

  function setActiveOrganizationId(organizationId: string | null) {
    setActiveOrganizationIdState(organizationId);
    if (organizationId) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
    else localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }

  async function loadOrganizations() {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const response = await apiClient.get<ApiResponse<Organization[]>>("/organizations", token);
      setOrganizations(response.data);

      const storedId = localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
      const nextActive = response.data.find((organization) => organization.id === storedId)?.id ?? response.data[0]?.id ?? null;
      setActiveOrganizationId(nextActive);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las organizaciones.");
      setOrganizations([]);
      setActiveOrganizationId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [isLoaded, isSignedIn]);

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [organizations, activeOrganizationId],
  );

  async function createOrganization(input: CreateOrganizationInput) {
    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<Organization>>("/organizations", input, token);
    setOrganizations((current) => [response.data, ...current.filter((organization) => organization.id !== response.data.id)]);
    setActiveOrganizationId(response.data.id);
    return response.data;
  }

  return {
    organizations,
    activeOrganization,
    activeOrganizationId,
    isLoading,
    error,
    reloadOrganizations: loadOrganizations,
    createOrganization,
    setActiveOrganizationId,
  };
}
